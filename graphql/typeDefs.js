const typeDefs = `#graphql
  # 1. Định nghĩa kiểu Address
  type Address {
    street: String
    city: String
    lat: Float
    lng: Float
  }

  # 2. User Type đầy đủ
  type User {
    id: ID!
    name: String
    email: String
    phone: String
    role: String
    avatar: String
    isVerified: Boolean
    walletBalance: Float
    address: Address
  }

  type Food {
    id: ID!
    name: String!
    price: Float!
    description: String
    image: String
    rating: Float
    reviews: Int
    category: String
    isAvailable: Boolean
    restaurantId: ID
  }

  type Order {
    id: ID!
    totalAmount: Float
    status: String
    items: [OrderItem]
    customerId: ID
    restaurantId: ID
    shipperId: ID
  }

  type OrderItem {
    foodId: ID
    name: String
    price: Float
    quantity: Int
    image: String
  }

  type AuthPayload {
    token: String
    user: User
    success: Boolean
    error: String
  }
  
  type DefaultResponse {
    success: Boolean!
    message: String
    error: String
  }

  type Message {
    _id: ID!
    orderId: ID!
    senderId: ID!
    senderName: String
    receiverId: ID!
    content: String!
    messageType: String
    isRead: Boolean
    createdAt: String
  }

  type Query {
    getFoods(category: String): [Food]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
    getUserProfile(id: ID!): User
    messages(orderId: ID!, limit: Int = 50, offset: Int = 0): [Message]
  }

  # --- PHẦN QUAN TRỌNG: Mutation chứa tất cả các hàm ---
  type Mutation {
    # Login
    login(identifier: String!, password: String!): AuthPayload

    # Register
    register(
      name: String!, 
      email: String!, 
      password: String!, 
      phone: String!, 
      role: String
    ): String

    # Verify OTP
    verifyOtp(email: String!, otp: String!): AuthPayload
    
    # Change Password
    changePassword(email: String!, newPassword: String!): DefaultResponse

    # Messages
    sendMessage(orderId: ID!, receiverId: ID!, content: String!, messageType: String): Message
    markMessagesRead(orderId: ID!, userId: ID!): Boolean
    # --- HÀM createFood PHẢI NẰM TRONG DẤU NGOẶC NÀY ---
    createFood(
      name: String!
      price: Float!
      description: String
      image: String
      category: String!
    ): Food
  }
`;

export { typeDefs };