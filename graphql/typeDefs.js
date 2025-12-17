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

  # --- Định nghĩa Category ---
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

  # --- CẬP NHẬT: Thêm các trường quan hệ cho Order ---
  type Order {
    id: ID!
    totalAmount: Float
    status: String
    items: [OrderItem]
    customerId: ID
    restaurantId: ID
    shipperId: ID
    createdAt: String       
    shippingAddress: Address
    # Các trường resolve từ User/Food
    customerUser: User
    restaurantUser: User
    restaurantFood: Food
    restaurant: User
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

  type Category {
    _id: ID!
    name: String!
    image: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

  type Restaurant {
    _id: ID!
    name: String!
    accountId: ID
    categories: [Category]
    rating: Float
    reviews: Int
    image: String
    address: Address
    isOpen: Boolean
    deliveryTime: String
    deliveryFee: Float
    createdAt: String
    updatedAt: String
  }

  type Query {
    # Categories for home / filters
    getCategories: [Category]
    getFoods(category: String): [Food]
    getRestaurants(category: String): [Restaurant]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
    getUserProfile(id: ID!): User
    messages(orderId: ID!, limit: Int = 50, offset: Int = 0): [Message]
    myFoods(category: String): [Food]
    getCategories: [Category]
    myShippingOrders: [Order]
    me: User
    getFoodReviews(foodId: ID!): [Review]
    myOrders: [Order]
  }
  
  type Mutation {
    # Login nhận identifier (email hoặc phone). Backwards-compatible: accepts identifier or email.
    login(identifier: String, email: String, password: String!): AuthPayload

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
    createRestaurant(
      name: String!
      categories: [ID]
      image: String
      address: Address
      isOpen: Boolean
      deliveryTime: String
      deliveryFee: Float
    ): Restaurant
    
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
    
    # --- Quản lý Category ---
    createCategory(name: String!, image: String): Category
    
    # --- Cập nhật thông tin cá nhân ---
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