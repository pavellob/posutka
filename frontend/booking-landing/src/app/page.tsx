import { Footer } from '@/components/Footer'
import { FreeChapters } from '@/components/FreeChapters'
import { Hero } from '@/components/Hero'
import { Introduction } from '@/components/Introduction'
import { NavBar } from '@/components/NavBar'
import { Resources } from '@/components/Resources'
import { Screencasts } from '@/components/Screencasts'
import { TableOfContents } from '@/components/TableOfContents'
import { Testimonial } from '@/components/Testimonial'
import avatarImage1 from '@/images/avatars/avatar-1.png'
import avatarImage2 from '@/images/avatars/avatar-2.png'

export default function Home() {
  return (
    <>
      <Hero />
      <Introduction />
      <NavBar />
      <TableOfContents />
      <Testimonial
        id="testimonial-from-booking-manager"
        author={{
          name: 'Анна Соколова',
          role: 'Менеджер бронирований (150 объектов)',
          image: avatarImage1,
        }}
      >
        <p>
          &ldquo;Домен Бронирования помог нам исключить овербукинги на 100% и увеличить конверсию в оплаченные брони на 40%. 
          Единый источник правды о заездах, автоматическая синхронизация с каналами — всё работает идеально.&rdquo;
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-finance-manager"
        author={{
          name: 'Михаил Козлов',
          role: 'Финансовый директор управляющей компании',
          image: avatarImage2,
        }}
      >
        <p>
          &ldquo;С доменом Бронирования у нас полная прозрачность доходов и автоматизация всех финансовых процессов. 
          Связка брони-платёж работает без сбоев, депозиты управляются автоматически.&rdquo;
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
