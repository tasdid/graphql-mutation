import { GraphQLServer } from 'graphql-yoga'
import uuidv4 from 'uuid/v4'
import db from './db'

const resolvers = {
    Query: {
        users(parent, args, { db }, info) {
            if (!args.query) 
                return db.users
            
            return db.users.filter((user) => {
                return user.name.toLowerCase().includes(args.query.toLowerCase())
            })
        },
        posts(parent, args, { db }, info) {
            if (!args.query) 
                return db.posts
            
            return db.posts.filter((post) => {
                const isTitleMatch = post.title.toLowerCase().includes(args.query.toLowerCase())
                const isBodyMatch = post.body.toLowerCase().includes(args.query.toLowerCase())
                return isTitleMatch || isBodyMatch
            })
        },
        comments(parent, args, { db }, info) {
            return db.comments
        }
    },
    Mutation: {
        createUser(parent, args, { db }, info) {
            console.log(args.data); console.log(args); 
            // use args.data when createUser(data: CreateUserInput):String
            const emailTaken = db.users.some((user) => user.email === args.email)
            if (emailTaken) throw new Error('Email taken')
            
            const user = {
                id: uuidv4(),
                ...args,
                // name: args.name,
                // email: args.email,
                // age: args.age
            }
            db.users.push(user)
            return user
        },
        deleteUser(parent, args, { db }, info) {
            const userIndex = db.users.findIndex((user) => user.id === args.id)
            if (userIndex === -1) throw new Error('User not found')
            
            const deletedUsers = db.users.splice(userIndex, 1)
            // filter out all posts and comments user created
            // first, keep posts which doesnt belong to deleted user
            db.posts = db.posts.filter((post) => {
                // was this post created by the deleted user
                const match = post.author === args.id
                // if this post is going to be deleted then delete all comments belong to it
                if (match) 
                    db.comments = db.comments.filter((comment) => comment.post !== post.id)
                // return true when we didnt find a match, keeping that post
                // alternatively we can say, selected post doesnt belong to deleted user    
                return !match
            })
            // delete all comments user created
            db.comments = db.comments.filter((comment) => comment.author !== args.id)
            return deletedUsers[0]
        },
        updateUser(parent, args, { db }, info) {
            const { id, data } = args
            const user = db.users.find((user) => user.id === id)

            if (!user) throw new Error('User not found')
            if (typeof data.email === 'string') {
                const emailTaken = db.users.some((user) => user.email === data.email)
                if (emailTaken) throw new Error('Email taken')
                user.email = data.email
            }
            if (typeof data.name === 'string')  user.name = data.name
            if (typeof data.age !== 'undefined') user.age = data.age
            return user
        },
        createPost(parent, args, { db }, info) {
            const userExists = db.users.some((user) => user.id === args.data.author)
            if (!userExists) throw new Error('User not found')
            const post = { id: uuidv4(), ...args.data }
            db.posts.push(post)
            return post
        },
        deletePost(parent, args, { db }, info) {
            const postIndex = db.posts.findIndex((post) => post.id === args.id)
            if (postIndex === -1) throw new Error('Post not found')
            const deletedPosts = db.posts.splice(postIndex, 1)
            db.comments = db.comments.filter((comment) => comment.post !== args.id)
            return deletedPosts[0]
        },
        updatePost(parent, args, { db }, info) {
            const { id, data } = args
            const post = db.posts.find((post) => post.id === id)
            if (!post) throw new Error('Post not found')
            if (typeof data.title === 'string') post.title = data.title
            if (typeof data.body === 'string') post.body = data.body
            if (typeof data.published === 'boolean') post.published = data.published
            return post
        },
        createComment(parent, args, { db }, info) {
            const userExists = db.users.some((user) => user.id === args.data.author)
            const postExists = db.posts.some((post) => post.id === args.data.post && post.published)
    
            if (!userExists || !postExists) throw new Error('Unable to find user and post')
            const comment = { id: uuidv4(), ...args.data }
            db.comments.push(comment)
            return comment
        },
        deleteComment(parent, args, { db }, info) {
            const commentIndex = db.comments.findIndex((comment) => comment.id === args.id)
    
            if (commentIndex === -1) throw new Error('Comment not found')
            const deletedComments = db.comments.splice(commentIndex, 1)
            return deletedComments[0]
        },
        updateComment(parent, args, { db }, info) {
            const { id, data } = args
            const comment = db.comments.find((comment) => comment.id === id)
    
            if (!comment) throw new Error('Comment not found')
            if (typeof data.text === 'string') comment.text = data.text
            return comment
        }
    },
    Post: {
        author(parent, args, { db }, info) {
            return db.users.find((user) => {
                return user.id === parent.author
            })
        },
        comments(parent, args, { db }, info) {
            return db.comments.filter((comment) => {
                return comment.post === parent.id
            })
        }
    },
    Comment: {
        author(parent, args, { db }, info) {
            return db.users.find((user) => {
                return user.id === parent.author
            })
        },
        post(parent, args, { db }, info) {
            return db.posts.find((post) => {
                return post.id === parent.post
            })
        }
    },
    User: {
        posts(parent, args, { db }, info) {
            return db.posts.filter((post) => {
                return post.author === parent.id
            })
        },
        comments(parent, args, { db }, info) {
            return db.comments.filter((comment) => {
                return comment.author === parent.id
            })
        }
    }
}
const server = new GraphQLServer({
    typeDefs: './schema.graphql',
    resolvers,
    context: { db }
})

server.start( () => {
    console.log(`Server started, listening on port localhost:${server.options.port} for incoming requests.`)
})

/*
mutation{
  createUser(name: "sasman", email: "sfgdsf@wedcvghj.com"){
    id
    name
    email
    age
  }
  createPost(data:{
    title:"crazy post", 
    body:"WTFTHISOPOST", 
    published: true, 
    author: "3"}){
    id
    # title
    body
    author{
      name
    }
    published
    comments{
      id
    }
  }
}

query{
  users{
    id
    name
    email
    age
    posts{
      title
      body
    }
    comments{
      text
    }
  }
 }
*/