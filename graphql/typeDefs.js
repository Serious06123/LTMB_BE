const typeDefs = `#graphql

  # 1. Định nghĩa kiểu Address
  type Address {
    street: String
    city: String
    lat: Float
    lng: Float
  }
  input AddressInput {
    street: String
    city: String
    lat: Float
    lng: Float
  }

  # --- THÊM: Định nghĩa Category ---
  type Category {
    id: ID!
    name: String!
    image: String
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
    createdAt: String  # Thêm trường này để hiển thị ngày
    restaurant: User   # Thêm trường này để lấy thông tin quán (tên, avatar)
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
  type Review {
    id: ID!
    userId: ID!
    foodId: ID!
    rating: Int!
    comment: String
    createdAt: String
    user: User 
  }

  type Query {
    getFoods(category: String): [Food]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
    getUserProfile(id: ID!): User
    messages(orderId: ID!, limit: Int = 50, offset: Int = 0): [Message]
    myFoods(category: String): [Food]
    getCategories: [Category]
    getFoodReviews(foodId: ID!): [Review]
    myOrders: [Order]
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
    # --- createFood ---
    createFood(
      name: String!
      price: Float!
      description: String
      image: String
      category: String!
    ): Food
    # --- updateFood ---
    updateFood(
      id: ID!
      name: String
      price: Float
      description: String
      image: String
      category: String
      isAvailable: Boolean 
    ): Food
    # --- THÊM: Quản lý Category (Chỉ Admin hoặc chạy script tạo) ---
    createCategory(name: String!, image: String): Category
    # --- THÊM: Cập nhật thông tin cá nhân ---
    updateProfile(
      name: String
      phone: String
      avatar: String
      address: AddressInput
    ): User
    addReview(
      foodId: ID!
      orderId: ID!
      rating: Int!
      comment: String
    ): Review
  }
`;

export { typeDefs };