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
        id="testimonial-from-realtor"
        author={{
          name: 'Елена Петрова',
          role: 'Риелтор-поисковик квартир (50+ владельцев)',
          image: avatarImage1,
        }}
      >
        <p>
          &ldquo;Сервис объектов помог нам увеличить количество найденных квартир в 3 раза и сократить время заключения договоров с недели до дня. 
          Теперь мы работаем с 50+ владельцами и управляем сетью из 200 объектов.&rdquo;
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-network-manager"
        author={{
          name: 'Дмитрий Волков',
          role: 'Менеджер сети субаренды (80 объектов)',
          image: avatarImage2,
        }}
      >
        <p>
          &ldquo;С сервисом объектов мы можем управлять сетью из 80 квартир без увеличения команды. 
          Автоматические договоры, координация заселений, аналитика по каждому объекту — всё под контролем.&rdquo;
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
