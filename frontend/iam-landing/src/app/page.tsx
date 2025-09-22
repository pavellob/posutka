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
        id="testimonial-from-it-director"
        author={{
          name: 'Анна Козлова',
          role: 'IT-директор сети отелей (120 номеров)',
          image: avatarImage1,
        }}
      >
        <p>
          &ldquo;IAM система помогла нам чётко разграничить права доступа между командой ресепшн, уборщиками и партнёрами. 
          Теперь каждый видит только то, что нужно для работы, а безопасность на высшем уровне.&rdquo;
        </p>
      </Testimonial>
      <Screencasts />
      <Testimonial
        id="testimonial-from-security-manager"
        author={{
          name: 'Михаил Петров',
          role: 'Менеджер по безопасности управляющей компании',
          image: avatarImage2,
        }}
      >
        <p>
          &ldquo;С IAM системой мы полностью контролируем, кто имеет доступ к каким данным. 
          Аудит показывает каждый вход в систему, а права можно отозвать мгновенно. Безопасность на 100%.&rdquo;
        </p>
      </Testimonial>
      <Resources />
      <FreeChapters />
      <Footer />
    </>
  )
}
