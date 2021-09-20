import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link'
import Head from 'next/head'

import Header from '../components/Header'

import Prismic from '@prismicio/client'
import { getPrismicClient } from '../services/prismic';

import { FiCalendar, FiUser } from 'react-icons/fi'
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useEffect, useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination } : HomeProps) {
  const [allPosts, setAllPosts] = useState<Post[]>(postsPagination.results)
  const [nextPage, setNextPage] = useState<string | false>(postsPagination.next_page)

  useEffect(() => {
    if (!postsPagination.next_page) {
      setNextPage(false)
    }

    const newPosts = postsPagination.results.map((post: Post) => {
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author
        }
      }
    })
    
    setAllPosts(newPosts)
  }, [postsPagination.results])

  async function handlePaginate() {
    fetch(nextPage as any)
    .then(response => response.json())
    .then(data => {
      const newPosts = data.results.map((post: Post) => {
        return {
          uid: post.uid,
          first_publication_date: post.first_publication_date,
          data: {
            title: post.data.title,
            subtitle: post.data.subtitle,
            author: post.data.author
          }
        }
      })
      setAllPosts([...allPosts, ...newPosts]) 
      if (!data.next_page) {
        setNextPage(false)
      } else {
        setNextPage(data.next_page)
      }
    })

  }; 

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <div className={styles.container}> 
        <Header />
        <div>
          {allPosts.map((post: Post) => (
              <div className={styles.post} key={post.uid}>
                <Link href={`/post/${post.uid}`}>
                  <h2>{post.data.title}</h2>
                </Link>
                <p>{post.data.subtitle}</p>
                <div className={styles["post-info"]}>
                  <span>
                    <FiCalendar />
                    { format(
                        new Date(post.first_publication_date),
                        "dd MMM yyyy",
                        {
                          locale: ptBR,
                        }
                      ) }
                  </span>
                  <span>
                    <FiUser />
                    {post.data.author}
                  </span>
                </div>
              </div>
          ))}
        </div>
        {
          nextPage &&
          <button 
            className={styles['load-posts-btn']}
            onClick={handlePaginate}
          >
            Carregar mais posts
          </button>
        }
      </div>
    </>
  )
}

export const getStaticPaths = () => {
  return {
    paths: [],
    fallback: true
  }
}

export const getStaticProps: GetStaticProps = async ({ preview = false, previewData }) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      orderings: '[document.first_publication_date desc]',
      pageSize: 2,
      ref: previewData?.ref ?? null
    }
  ); 

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page ? postsResponse.next_page : false,
        results: postsResponse.results
      }
    },
    revalidate: 60 * 60 // 1 hour
  }
};
