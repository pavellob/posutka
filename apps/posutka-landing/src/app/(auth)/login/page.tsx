import { type Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/Button'
import { TextField } from '@/components/Fields'
import { Logo } from '@/components/Logo'
import { SlimLayout } from '@/components/SlimLayout'

export const metadata: Metadata = {
  title: 'Вход в систему',
}

export default function Login() {
  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h2 className="mt-20 text-lg font-semibold text-gray-900">
        Войдите в свой аккаунт
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Нет аккаунта?{' '}
        <Link
          href="/register"
          className="font-medium text-blue-600 hover:underline"
        >
          Зарегистрироваться
        </Link>{' '}
        бесплатно.
      </p>
      <form action="#" className="mt-10 grid grid-cols-1 gap-y-8">
        <TextField
          label="Email адрес"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <div>
          <Button type="submit" variant="solid" color="blue" className="w-full">
            <span>
              Войти <span aria-hidden="true">&rarr;</span>
            </span>
          </Button>
        </div>
      </form>
    </SlimLayout>
  )
}
