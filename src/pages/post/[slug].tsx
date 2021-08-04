import { useEffect, useState } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';

import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';


import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi'

import styles from './post.module.scss';
import Header from '../../components/Header';

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
            
        </article>
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

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
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

  return {
    props: {
      post
    },
    revalidate: 10,
  }
};
