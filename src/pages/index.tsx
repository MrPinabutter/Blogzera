import { useState } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../services/prismic';

import { FiCalendar, FiUser } from 'react-icons/fi'

import styles from './home.module.scss';

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
  preview?: boolean;
}

export default function Home({ postsPagination, preview }: HomeProps) {
  const [posts, setPosts] = useState(postsPagination.results);

  function handleUpdatePosts() {
    try {
      if(postsPagination.next_page)
        fetch(postsPagination.next_page)
          .then(res => res.json())
          .then(data => {
            if(data.results !== null)
              setPosts(old => {
                postsPagination.next_page = data.next_page

                const newPosts = data.results.map(post => {
                  return {
                    uid: post.uid,
                    first_publication_date: post.first_publication_date,
                    data: {
                      title: post.data.title,
                      subtitle: post.data.subtitle,
                      author: post.data.author,
                    },
                  }
                }
              )
    
              return [
              ...old,
              ...newPosts]
            })
          }
        )
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <>
      <Head>
        <title>Blog | Posts</title>
      </Head>

      <main className={styles.container}>
        <header>
          <img src="/Logo.svg" alt="logo" />
        </header>

        { posts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <div className={styles.post}>
                <h1>{post.data.title}</h1>
                <p>{post.data.subtitle}</p>

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
                </div>
              </div>
            </Link>
          ))
        }
        { postsPagination.next_page &&
          <button onClick={handleUpdatePosts}>
            Carregar mais posts
          </button>
        }
        {preview && (
          <aside>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({previewData, preview=false}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    fetch: ['post.title', 'post.subtitle', 'post.last_publication_date', 'post.author'],
    pageSize: 1,
    ref: previewData?.ref ?? null,
  });

  const posts = postsResponse.results.map(post => {
      return {
        uid: post.uid,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
        first_publication_date: post.first_publication_date
      }
    }
  )

  return {
    props: {
      postsPagination: {
        results: posts,
        next_page: postsResponse.next_page,
        preview
      }
    }
  }
};
