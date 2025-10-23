import { Logo } from '@/app/logo'
import { Button } from '@/components/button'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Strong, Text, TextLink } from '@/components/text'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Восстановление пароля',
}

export default function Login() {
  return (
    <form action="" method="POST" className="grid w-full max-w-sm grid-cols-1 gap-8">
      <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
      <Heading>Восстановите пароль</Heading>
      <Text>Введите ваш email и мы отправим вам ссылку для восстановления пароля.</Text>
      <Field>
        <Label>Email</Label>
        <Input type="email" name="email" />
      </Field>
      <Button type="submit" className="w-full">
        Восстановить пароль
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
