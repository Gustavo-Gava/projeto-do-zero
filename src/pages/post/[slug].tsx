import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GetStaticPaths, GetStaticProps } from 'next';

import Header from '../../components/Header'
import { FiCalendar, FiUser, FiClock} from 'react-icons/fi'

import { RichText,  } from 'prismic-dom'
import Prismic from '@prismicio/client'
import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';
import {useRouter} from 'next/router';
import { useEffect, useState } from 'react';

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
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const [timeRead, setTimeRead] = useState(0)

  const router = useRouter()

  if (router.isFallback) {
    return <div className={styles.loading}>Carregando...</div>
  }

  useEffect(() => {
    const textHeading = post.data.content.map(item => item.heading)
    const textBody = post.data.content.map(item => RichText.asText(item.body))
    
    const wordsArray = [...textBody, ...textHeading]

    const allWords = wordsArray.reduce((total, array) => total + array).split(" ")

    const timeRead = Math.ceil(allWords.length / 200)

    setTimeRead(timeRead)
  }, [post])

  return (
    <div className={styles.container}>
      <Header />

      <div className={styles.banner}>
        <img src={post.data.banner.url} alt="banner" />
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
          <span>
            <FiClock />
            {timeRead} min
          </span>
        </div>

        {post.data.content.map(content => (
          <div key={Math.random()} className={styles.section}>
            <h2>{content.heading}</h2>

            <p
            dangerouslySetInnerHTML={{__html: RichText.asHtml(content.body.map(item => item))}}
            >
            </p>
          </div>
        ))}

      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params
  
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  return {
    props: {
      post: response
    },
    revalidate: 60 * 60 // 1 hour
  }
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      orderings: '[document.first_publication_date]',
      pageSize: 3,
    }
  );

  const slugs = posts.results.reduce((arr, post) => {
    arr.push(post.uid);

    return arr;
  }, []);

  const params = slugs.map(slug => {
    return {
      params: { slug },
    };
  });

  return {
    paths: params,
    fallback: true,
  };
};