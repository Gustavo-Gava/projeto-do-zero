import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetStaticPaths, GetStaticProps } from 'next';

import Header from '../../components/Header'
import { FiCalendar, FiUser} from 'react-icons/fi'

import { RichText,  } from 'prismic-dom'
import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';
import {useRouter} from 'next/router';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: string
    }[];
  };
}

interface PostProps {
  post: Post;
}

interface Section {
  heading: string,
  body: {
    text: string
  }[]
}

export default function Post({ post }: PostProps) {
  console.log(post)

  const router = useRouter()

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.banner}>
        <img src='/banner.png' alt="banner" />
      </div>

      <div className={styles['container-text']}>
        <h1>{post.data.title}</h1>
        <div className={styles['post-info']}>
          <span>
            <FiUser />
            {post.data.author}
          </span>
          <span>
            <FiCalendar />
            {format(
              new Date(post.first_publication_date),
              "dd MMM yyyy",
              {
                locale: ptBR,
              }
            )}
          </span>
          {/* <span>
            {post.data.content.reduce((total, text) => RichText.asText(item.body))}
          </span> */}
        </div>

        {post.data.content.map(content => (
          <div key={Math.random()} className={styles.section}>
            <h2>{content.heading}</h2>

            <p
              dangerouslySetInnerHTML={{__html: content.body}}
            >
              
            </p>
          </div>
        ))}

      </div>
    </div>
  )
}

// export const getStaticPaths = async () => {
//   const prismic = getPrismicClient();
//   const posts = await prismic.query(TODO);

//   // TODO
// };

// export const getStaticProps = async context => {
//   const prismic = getPrismicClient();
//   const response = await prismic.getByUID(TODO);

//   // TODO
// };

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params
  
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  console.log(JSON.stringify(response, null, 2))

  const post = {
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      author: response.data.author,
      banner: {
        url: response.data.banner.url
      },
      content: response.data.content.map((section: Section) => {
          return {
            heading: section.heading,
            body: RichText.asHtml(section.body)
          }
        })
    }
  }

  console.log(JSON.stringify(post.data.content, null, 2))

  return {
    props: {
      post
    },
    revalidate: 60 * 60 // 1 hour
  }
}

export const getStaticPaths = () => {
  return {
    paths: [],
    fallback: true
  }
}