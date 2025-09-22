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
        id="testimonial-from-network-manager"
        author={{
          name: 'Елена Смирнова',
          role: 'Менеджер сети "Уютные Дома" (45 объектов)',
          image: avatarImage1,
        }}
      >
        <p>
          "Система операций позволила нам масштабироваться с 15 до 45 объектов без увеличения штата менеджеров. 
          Все процессы автоматизированы, качество контролируется, а гости получают стабильный сервис."
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-property-owner"
        author={{
          name: 'Дмитрий Волков',
          role: 'Собственник 20 объектов недвижимости',
          image: avatarImage2,
        }}
      >
        <p>
          "За год использования системы моя чистая прибыль выросла на 40%. Никаких пропущенных уборок, 
          забытых ремонтов или недовольных гостей. Все под контролем, даже когда я в отпуске."
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
