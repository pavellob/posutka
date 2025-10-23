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

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
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

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await graphqlClient.request(REGISTER_MUTATION, {
        input: {
          email: formData.email,
          name: formData.name,
          password: formData.password
        }
      }) as any;

      // Сохраняем токены
      localStorage.setItem('accessToken', result.register.accessToken);
      localStorage.setItem('refreshToken', result.register.refreshToken);
      
      // Перенаправляем в приложение
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
      <Heading>Создайте свой аккаунт</Heading>
      
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
        <Label>Полное имя</Label>
        <Input 
          name="name" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </Field>
      <Field>
        <Label>Пароль</Label>
        <Input 
          type="password" 
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          autoComplete="new-password" 
          required 
        />
      </Field>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Создание аккаунта...' : 'Создать аккаунт'}
      </Button>
      <Text>
        Уже есть аккаунт?{' '}
        <TextLink href="/login">
          <Strong>Войти</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
