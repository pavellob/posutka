'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/app/logo'
import { Button } from '@/components/button'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Strong, Text, TextLink } from '@/components/text'
import { graphqlClient } from '@/lib/graphql-client'
import { gql } from 'graphql-request'

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user {
        id
        email
        name
      }
      accessToken
      refreshToken
      expiresIn
    }
  }
`;

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await graphqlClient.request(LOGIN_MUTATION, {
        input: {
          email: formData.email,
          password: formData.password
        }
      }) as any;

      // Сохраняем токены
      localStorage.setItem('accessToken', result.login.accessToken);
      localStorage.setItem('refreshToken', result.login.refreshToken);
      
      // Перенаправляем в приложение
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
      <Heading>Войдите в свой аккаунт</Heading>
      
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <Field>
        <Label>Email</Label>
        <Input 
          type="email" 
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required 
        />
      </Field>
      <Field>
        <Label>Пароль</Label>
        <Input 
          type="password" 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required 
        />
      </Field>
      
      <div className="flex items-center justify-between">
        <Text>
          <TextLink href="/forgot-password">
            <Strong>Забыли пароль?</Strong>
          </TextLink>
        </Text>
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Вход...' : 'Войти'}
      </Button>
      <Text>
        Нет аккаунта?{' '}
        <TextLink href="/register">
          <Strong>Зарегистрироваться</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
