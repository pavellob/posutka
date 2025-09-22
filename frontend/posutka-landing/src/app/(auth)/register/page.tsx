import { type Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/Button'
import { SelectField, TextField } from '@/components/Fields'
import { Logo } from '@/components/Logo'
import { SlimLayout } from '@/components/SlimLayout'

export const metadata: Metadata = {
  title: 'Регистрация',
}

export default function Register() {
  return (
    <SlimLayout>
      <div className="flex">
        <Link href="/" aria-label="Home">
          <Logo className="h-10 w-auto" />
        </Link>
      </div>
      <h2 className="mt-20 text-lg font-semibold text-gray-900">
        Подключите жильё бесплатно
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        Уже есть аккаунт?{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:underline"
        >
          Войти
        </Link>{' '}
        в систему.
      </p>
      <form
        action="#"
        className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2"
      >
        <TextField
          label="Имя"
          name="first_name"
          type="text"
          autoComplete="given-name"
          required
        />
        <TextField
          label="Фамилия"
          name="last_name"
          type="text"
          autoComplete="family-name"
          required
        />
        <TextField
          className="col-span-full"
          label="Email адрес"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          className="col-span-full"
          label="Пароль"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <SelectField
          className="col-span-full"
          label="Как вы узнали о нас?"
          name="referral_source"
        >
          <option>Поиск в интернете</option>
          <option>Рекомендация знакомых</option>
          <option>Социальные сети</option>
          <option>Реклама</option>
          <option>Другое</option>
        </SelectField>
        <div className="col-span-full">
          <Button type="submit" variant="solid" color="blue" className="w-full">
            <span>
              Подключить жильё <span aria-hidden="true">&rarr;</span>
            </span>
          </Button>
        </div>
      </form>
    </SlimLayout>
  )
}
