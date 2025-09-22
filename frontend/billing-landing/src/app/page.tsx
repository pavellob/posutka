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
        id="testimonial-from-finance-director"
        author={{
          name: 'Мария Петрова',
          role: 'Финансовый директор (200 объектов)',
          image: avatarImage1,
        }}
      >
        <p>
          &ldquo;Домен Billing помог нам автоматизировать 95% финансовых операций и сократить время на сверки с 3 дней до 2 часов. 
          Прозрачность для гостей, автоматические выплаты владельцам — всё работает без сбоев.&rdquo;
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-accountant"
        author={{
          name: 'Александр Козлов',
          role: 'Главный бухгалтер управляющей компании',
          image: avatarImage2,
        }}
      >
        <p>
          &ldquo;С доменом Billing у нас полная прозрачность всех финансовых операций. Автоматические сверки, 
          интеграция с банками, отчётность для владельцев — всё работает как часы.&rdquo;
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
