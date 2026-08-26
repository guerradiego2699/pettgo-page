export interface ForumThread {
  id: string
  author_id: string
  title: string
  body: string
  created_at: string
}

export interface ForumPost {
  id: string
  thread_id: string
  author_id: string
  body: string
  created_at: string
}
