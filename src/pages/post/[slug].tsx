import { format, lastDayOfDecade } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import Head from 'next/head'
import Link from 'next/link'
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
  last_publication_date: string | null
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

interface NeighborPost {
  title: string
  slug: string
}
interface NeighborsPosts {
  prevPost: NeighborPost
  nextPost: NeighborPost
}

interface PostProps {
  post: Post;
  neighborsPosts: NeighborsPosts
}

export default function Post({ post, neighborsPosts }: PostProps) {
  console.log('oi')
  const [ timeRead, setTimeRead ] = useState(0)
  const [ nextPost, setNextPost ] = useState<NeighborPost | false>({title: '', slug: ''})
  const [ prevPost, setPrevPost ] = useState<NeighborPost | false>({title: '', slug: ''})

  const router = useRouter()
  if (router.isFallback) {
    return <div className={styles.loading}>Carregando...</div>
  }

  function loadNeighborsPosts() {
    if (neighborsPosts.nextPost) {
      setNextPost({
        title: neighborsPosts.nextPost.title,
        slug: neighborsPosts.nextPost.slug
      }) 
    } else {
      setNextPost(false)
    }
    
    if (neighborsPosts.prevPost) {
      setPrevPost({
        title: neighborsPosts.prevPost.title,
        slug: neighborsPosts.prevPost.slug
      }) 
    } else {
      setPrevPost(false)
    }
  }

  useEffect(() => {
    loadNeighborsPosts()

    const textHeading = post.data.content.map(item => item.heading)
    const textBody = post.data.content.map(item => RichText.asText(item.body))
    
    const wordsArray = [...textBody, ...textHeading]

    const allWords = wordsArray.reduce((total, array) => total + array).split(" ")

    const timeRead = Math.ceil(allWords.length / 200)

    setTimeRead(timeRead)
  }, [post])

  return (
    <> 
      <Head>
        <title>{post.data.title}</title>
      </Head> 

      <div className={styles.container}>
        <Header />

        <div className={styles.banner}>
          <img src={post.data.banner.url} alt="banner" />
        </div>

        <div className={styles['container-text']}>
          <h1>{post.data.title}</h1>
          <div className={styles['post-info']}>
            <div>
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
            {post.last_publication_date !== post.first_publication_date ? (
              <div className={styles['edit-info']}>
                {format(
                new Date(post.last_publication_date),
                "'*editado em 'dd MMM yyyy 'às' HH:mm'h'",
                {
                  locale: ptBR,
                }
              )
              }
              </div>
            ) : ''
          } 
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

        <div className={styles.line}></div>

        <div className={styles['container-posts-pagination']} > 
          { prevPost ? (
          <Link href={`/post/${prevPost?.slug}`}>
            <div>
              <span>{prevPost?.title}</span>
              <span>Post Anterior</span> 
            </div>
          </Link>
          ) : '' }

          { nextPost ? (
            <Link href={`/post/${nextPost.slug}`}>
            <div>
              <span>{nextPost.title}</span>
              <span>Próximo Post</span>
            </div>
          </Link>
          ) : ''}

        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params
  
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const nextPost = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      orderings: '[document.first_publication_date]',
      after: `${response.id}`,  
    }
  ); 

  const prevPost = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
      after: `${response.id}`,  
    }
  ); 

  const neighborsPosts = {
    prevPost: prevPost.results_size > 0
    ? { 
      title: prevPost.results[0].data.title, 
      slug: prevPost.results[0].uid
    }
    : false
    ,
    nextPost: nextPost.results_size > 0
    ? {
      title: nextPost.results[0].data.title,
      slug: nextPost.results[0].uid
      }
    : false
  }

  console.log(prevPost)

  return {
    props: {
      post: response,
      neighborsPosts
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