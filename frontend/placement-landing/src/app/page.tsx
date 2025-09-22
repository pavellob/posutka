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
        id="testimonial-from-channel-manager"
        author={{
          name: 'Анна Смирнова',
          role: 'Менеджер по каналам (80 объектов)',
          image: avatarImage1,
        }}
      >
        <p>
          &ldquo;Домен Placement помог нам увеличить продажи на 60% за счёт подключения новых каналов. 
          Один клик — и цены обновляются везде, никаких овербукингов, полная синхронизация.&rdquo;
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-revenue-manager"
        author={{
          name: 'Максим Петров',
          role: 'Ревеню-менеджер управляющей компании',
          image: avatarImage2,
        }}
      >
        <p>
          &ldquo;С доменом Placement у нас полный контроль над всеми каналами. Централизованное управление ценами, 
          автоматическая синхронизация, аналитика по каждому каналу — всё работает идеально.&rdquo;
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
