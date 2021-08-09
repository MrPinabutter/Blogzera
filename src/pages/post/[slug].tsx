import { useEffect, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi'

import Header from '../../components/Header';
import Comments from '../../components/Comments';

import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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

interface ProxPage {
  uid: string;
  data: {
    title: string;
  }
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPost?: ProxPage
  prevPost?: ProxPage
}

export default function Post({ post, preview, nextPost, prevPost }: PostProps) {
  const [timeToRead, setTimeToRead] = useState('0');
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  useEffect(() => {
    const time = (post.data.content.reduce((acc, value) => {
      const words = acc + RichText.asText(value.body).split(' ').length;
      return words
    }, 0) / 200 + 1).toFixed(0)

    setTimeToRead(time)
  }, [])

  return (
    <>
      <Head>
        <title>Blog | {post.data.title}</title>
      </Head>
      <Header />
      
      <main className={styles.container}>
        <img src={post.data.banner.url} alt="img" />
        <article>
          <h1>{post.data.title}</h1>
          <div className={styles.infoContainer}>
            <div className={styles.info}>
              <time>
                <FiCalendar size={20} />
                {format(
                    new Date(post.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
              </time>

              <span>
                <FiUser size={20} />
                {post.data.author}
              </span>

              <time>
                <FiClock size={20} />
                {timeToRead} min
              </time>
            </div>
            <small>* editado em 
                  {format(
                    new Date(post.last_publication_date),
                    ' dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                  , às
                  {format(
                    new Date(post.last_publication_date),
                    ' H:m',
                    {
                      locale: ptBR,
                    }
                  )}
            </small>
          </div>

          <section className={styles.content}>
            {
              post.data.content.map(topic => (
                <div key={topic.heading}>
                  <h1>{topic.heading}</h1>
                  <div dangerouslySetInnerHTML={{__html: RichText.asHtml(topic.body)}} />
                </div>
              ))
            }
          </section>

          <div className={styles.divisor} />
          
          <nav className={styles.navigatePosts}>
            {nextPost.data && (
              <div>
                <span>
                  {nextPost.data.title}
                </span>
                <Link href={`${nextPost.uid}`}>
                  <a>Próximo post</a>
                </Link>
              </div>
            )}

            {prevPost.data && (
              <div>
                <span>
                  {prevPost.data.title}
                </span>
                <Link href={`${prevPost.uid}`}>
                  <a className={styles.right}>Post anterior</a>
                </Link>
              </div>
            )}
          </nav>
        </article>
        <Comments  />
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    fetch: ['post.uid'],
    pageSize: 20,
  });

  const newPaths = posts.results.map(post => ({
    params: {
      slug: post.uid
    }
  }))

  return {
    paths: newPaths,
    fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async ({preview=false, previewData, params}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  
  const response = await prismic.getByUID('post', String(slug), {ref: previewData?.ref ?? null});


  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url
      },
      author: response.data.author,
      content: response.data.content,
    }
  }

  const prevPost = (await prismic.query(
    Prismic.predicates.at('document.type', 'post'), { 
      orderings: '[document.last_publication_date desc]',
      pageSize: 1, 
      after: `${response.id}`, 
    }))

  const nextPost = (await prismic.query(
    Prismic.predicates.at('document.type', 'post'), { 
      pageSize: 1, 
      orderings: '[document.last_publication_date]',
      after: `${response.id}`, 
    }))

  nextPost.results
  
  return {
    props: {
      post,
      preview,
      prevPost: prevPost.results[0],
      nextPost: nextPost.results[0],
    },
    revalidate: 10,
  }
};
