export const typeDefs = `#graphql
  type User {
    id: ID
    name: String
    email: String
    role: String
  }

  type Ingredient {
    name: String
    icon: String
  }

  type Food {
    id: ID!
    name: String
    price: Float
    image: String
    rating: Float
    reviews: Int
    category: String
    status: String
    description: String
    ingredients: [Ingredient]
  }

  type OrderItem {
    name: String
    price: Float
    quantity: Int
    image: String
    tag: String
  }

  type Order {
    id: ID
    status: String
    totalAmount: Float
    items: [OrderItem]
    shipperId: ID
  }

  type AuthPayload {
    success: Boolean!
    token: String
    error: String
    user: User
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(name: String!, email: String!, password: String!): AuthPayload!
    changePassword(email: String!, newPassword: String!): AuthPayload!
  }

  type Query {
    getFoods(category: String): [Food]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
  }
`;