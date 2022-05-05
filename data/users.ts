interface User {
  email: string
  password: string
}

const user1: User | undefined = (process.env.USER1_EMAIL && process.env.USER1_PASSWORD)
  ? {
      email: process.env.USER1_EMAIL,
      password: process.env.USER1_PASSWORD
    }
  : undefined

const user2: User | undefined = (process.env.USER2_EMAIL && process.env.USER2_PASSWORD)
  ? {
      email: process.env.USER2_EMAIL,
      password: process.env.USER2_PASSWORD
    }
  : undefined

const user3: User | undefined = (process.env.USER3_EMAIL && process.env.USER3_PASSWORD)
  ? {
      email: process.env.USER3_EMAIL,
      password: process.env.USER3_PASSWORD
    }
  : undefined

const user4: User | undefined = (process.env.USER4_EMAIL && process.env.USER4_PASSWORD)
  ? {
      email: process.env.USER4_EMAIL,
      password: process.env.USER4_PASSWORD
    }
  : undefined

const user5: User | undefined = (process.env.USER5_EMAIL && process.env.USER5_PASSWORD)
  ? {
      email: process.env.USER5_EMAIL,
      password: process.env.USER5_PASSWORD
    }
  : undefined

const users: User[] = []

if (user1) users.push(user1)
if (user2) users.push(user2)
if (user3) users.push(user3)
if (user4) users.push(user4)
if (user5) users.push(user5)

export default users
