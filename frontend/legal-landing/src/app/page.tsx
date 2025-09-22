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
        id="testimonial-from-legal-counsel"
        author={{
          name: 'Елена Власова',
          role: 'Юрисконсульт (150 объектов)',
          image: avatarImage1,
        }}
      >
        <p>
          &ldquo;Домен Legal помог нам исключить 100% споров с гостями и владельцами. Автоматические договоры, 
          прозрачные депозиты, полная юридическая защита — каждый заезд теперь под правовым щитом.&rdquo;
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-compliance-manager"
        author={{
          name: 'Андрей Козлов',
          role: 'Менеджер по комплаенсу',
          image: avatarImage2,
        }}
      >
        <p>
          &ldquo;С доменом Legal у нас полная прозрачность всех юридических операций. Автоматические договоры, 
          аудит депозитов, доказательная база для споров — всё работает без сбоев.&rdquo;
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
