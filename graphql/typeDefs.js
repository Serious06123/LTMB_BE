const typeDefs = `#graphql

  # 1. Định nghĩa kiểu Address (Output)
  type Address {
    street: String
    city: String
    lat: Float
    lng: Float
  }
  
  # 2. Định nghĩa kiểu AddressInput (Input - Dùng cho Mutation)
  input AddressInput {
    street: String
    city: String
    lat: Float
    lng: Float
  }

  type Category {
    _id: ID!
    id: ID
    name: String!
    image: String
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }

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
    restaurant: Restaurant
  }

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
  type Shipper {
    _id: ID!
    name: String!
    accountId: ID
    rating: Float
    reviews: Int
    image: String
    address: Address # Tái sử dụng type Address (chỉ cần trả về lat/lng)
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }
  type CartItem {
    foodId: ID
    name: String
    price: Float
    quantity: Int
    image: String
  }

  type Cart {
    _id: ID!
    userId: ID
    restaurantId: ID
    items: [CartItem]
    totalAmount: Float
    updatedAt: String
  }

  input CartItemInput {
    foodId: ID!
    name: String
    price: Float
    quantity: Int!
    image: String
  }
  
  input CreateOrderItemInput {
    foodId: ID
    name: String
    price: Float
    quantity: Int
    image: String
  }

  input CreateOrderInput {
    restaurantId: ID!
    shipperId: ID!
    items: [CreateOrderItemInput]!
    totalAmount: Float!
    paymentMethod: String
    shippingAddress: AddressInput
  }
  type Query {
    getCategories: [Category]
    getFoods(category: String): [Food]
    getRestaurants(category: String): [Restaurant]
    getRunningOrders: [Order]
    myRunningOrders(userId: ID!): [Order]
    getUserProfile(id: ID!): User
    messages(orderId: ID!, limit: Int = 50, offset: Int = 0): [Message]
    myFoods(category: String): [Food]
    myShippingOrders: [Order]
    me: User
    getFoodReviews(foodId: ID!): [Review]
    myOrders: [Order]
    getShipperProfile: Shipper
    myCart: Cart
    getFood(id: ID!): Food
    getFoodsByRestaurant(restaurantId: ID!, category: String): [Food]
    getOrder(id: ID!): Order
    # Lấy thông tin quán của user đang đăng nhập
    myRestaurantProfile: Restaurant
    # Lấy đơn hàng của quán (có thể lọc theo trạng thái)
    myRestaurantOrders(status: String): [Order]
    getAllShippers: [Shipper]
  }
  
  type Mutation {
    login(identifier: String, email: String, password: String!): AuthPayload

    register(
      name: String!, 
      email: String!, 
      password: String!, 
      phone: String!, 
      role: String
    ): String

    verifyOtp(email: String!, otp: String!): AuthPayload
    
    changePassword(email: String!, newPassword: String!): DefaultResponse

    sendMessage(orderId: ID!, receiverId: ID!, content: String!, messageType: String): Message
    markMessagesRead(orderId: ID!, userId: ID!): Boolean
    
    createFood(
      name: String!
      price: Float!
      description: String
      image: String
      category: String!
    ): Food
    
    # --- ĐÃ SỬA: address: Address -> address: AddressInput ---
    createRestaurant(
      name: String!
      categories: [ID]
      image: String
      address: AddressInput  
      isOpen: Boolean
      deliveryTime: String
      deliveryFee: Float
    ): Restaurant
    
    updateFood(
      id: ID!
      name: String
      price: Float
      description: String
      image: String
      category: String
      isAvailable: Boolean 
    ): Food
    
    createCategory(name: String!, image: String): Category
    
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
    createShipper(
      name: String!
      image: String
      lat: Float
      lng: Float
    ): Shipper
    
    updateShipperStatus(isActive: Boolean!): Shipper
    updateCart(
      restaurantId: ID!
      items: [CartItemInput]!
    ): Cart
    createOrder(input: CreateOrderInput!): Order
    
    # Xóa sạch giỏ hàng (sau khi đặt đơn xong)
    clearCart: Boolean
    updateRestaurantStatus(isOpen: Boolean!): Restaurant
  }
`;

export { typeDefs };