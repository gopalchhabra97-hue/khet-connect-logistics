# FarmLink Connect

Take this as logo and color theme of complete website generation  and add colors of text accordingly 
You are acting as a senior AI product engineer, full-stack architect, frontend engineer, UI/UX designer, and hackathon product designer.

Build a complete, polished, responsive frontend-first web application prototype for our Smart India Hackathon 2026 project.

PROJECT

Organization:
CodeAxis

Product:
KHETSETU

Tagline:
Connecting Supply, Demand & Logistics

Official SIH Problem Statement ID:
SIH26033

Official Problem Statement:
“Multiple Intermediaries Reduce Farmers Earnings And Increase Consumer Prices”

Theme:
Agriculture, FoodTech & Rural Development

IMPORTANT EXECUTION REQUIREMENT

Do not build only a landing page or static mockup.

Build a complete working prototype with:

- Public landing page
- Mock login
- Role-based dashboards
- Farmer/FPO experience
- Buyer marketplace
- Driver experience
- Admin dashboard
- Product management
- Order management
- Logistics grouping
- Vehicle and driver matching
- Route optimization demo
- Delivery tracking
- Demand forecasting demo
- Notifications
- Responsive mobile navigation
- Shared interactive demo state

Use realistic mock data only. Do not require a real backend, database, payment gateway, live GPS, routing API, or AI service.

Structure the code so Supabase, REST APIs, FastAPI, PostgreSQL, Python forecasting, OR-Tools, and OpenStreetMap routing can be connected later without redesigning the frontend.

Do not claim guaranteed farmer income growth, guaranteed price reduction, 100% AI accuracy, complete elimination of intermediaries, real-time GPS, real traffic information, or production AI results.

Do not add blockchain, cryptocurrency, NFT, IoT, drones, computer vision, facial recognition, voice assistants, generic chatbots, or unrelated social features.

==================================================
BRAND AND ASSET REQUIREMENTS
==================================================

Use the uploaded image file:

khetsetu.jpg

as the official KHETSETU logo.

If the image is available in the project files:

- Copy/use it as a public/static asset.
- Display it on the landing page.
- Display it on the login page.
- Display it in the desktop sidebar.
- Use meaningful alt text.
- Do not replace it with a generic logo or stock image.

Branding:

KHETSETU
Connecting Supply, Demand & Logistics

CodeAxis should appear as the organization or technology partner.

Do not change the official problem statement title.

==================================================
DESIGN SYSTEM
==================================================

Create a serious production-style Indian agricultural SaaS interface, suitable for Smart India Hackathon judges.

Visual direction:

- Modern
- Clean
- Trustworthy
- Professional
- Agriculture-inspired
- Easy for farmers and first-time digital users
- Excellent desktop experience
- Fully responsive mobile experience
- Clear visual hierarchy
- Strong whitespace
- Rounded cards
- Subtle shadows
- Consistent spacing
- Accessible contrast
- Clear status badges
- Lucide icons
- Minimal animations
- No excessive gradients
- No glassmorphism
- No random emojis
- No generic AI-generated template styling
- No Amazon-like marketplace layout

Use the logo’s visual identity:

- Deep green
- Fresh green
- White
- Soft neutral backgrounds
- Small amounts of blue for information
- Orange/yellow for warnings
- Red only for errors or rejected states

Do not make every element green.

Use Inter or a similar modern sans-serif font.

Create a reusable design system for:

- Buttons
- Cards
- Tables
- Inputs
- Tabs
- Badges
- Modals
- Toasts
- Empty states
- Loading states
- Error states
- Charts
- Timelines

==================================================
CORE BUSINESS FLOW
==================================================

The main product flow is:

Farmer/FPO
→ Lists agricultural produce
→ Buyer browses marketplace
→ Buyer places order
→ Farmer accepts or rejects order
→ Accepted orders are grouped
→ Compatible vehicle and driver are matched
→ Demo route is planned
→ Consolidated delivery is tracked
→ Buyer receives order

Separate demand intelligence flow:

Historical Orders
→ Data Processing
→ Demand Forecasting
→ Predicted Future Demand
→ Supply/Demand Insight
→ Farmer/FPO Supply Planning

==================================================
APPLICATION ROLES
==================================================

Create four role-based experiences:

1. Farmer/FPO
2. Buyer
3. Driver
4. Admin

Use mock authentication.

After login, route users to the correct role dashboard.

Add a clearly visible:

DEMO MODE

indicator in the application shell.

==================================================
SHARED APPLICATION SHELL
==================================================

Create a shared dashboard shell containing:

- Desktop sidebar
- Responsive mobile drawer
- Top navigation
- User profile menu
- Notifications
- Role badge
- DEMO MODE badge
- Logout
- Breadcrumbs where useful
- Search where appropriate
- Responsive layout
- Accessible keyboard controls

Use role-specific sidebar navigation.

FARMER/FPO SIDEBAR:

- Dashboard
- My Products
- Orders
- Demand Forecast
- Deliveries
- Profile

BUYER SIDEBAR:

- Dashboard
- Marketplace
- My Orders
- Order Tracking
- Profile

DRIVER SIDEBAR:

- Dashboard
- Assigned Deliveries
- Route
- Delivery History
- Profile

ADMIN SIDEBAR:

- Dashboard
- Farmers/FPOs
- Buyers
- Products
- Orders
- Logistics
- Vehicles & Drivers
- Demand Analytics
- Settings

==================================================
PUBLIC LANDING PAGE
==================================================

Create a highly polished landing page.

Hero headline:

Connect Farmers. Understand Demand. Deliver Smarter.

Subheadline:

KHETSETU connects farmers and FPOs directly with consumers and bulk buyers while coordinating intelligent agricultural logistics.

Primary CTA:

Explore Marketplace

Secondary CTA:

How It Works

SIH badge:

Smart India Hackathon 2026 • SIH26033

Use the uploaded KHETSETU logo prominently in the hero area.

Hero visual should communicate:

Farmer/FPO
→ Marketplace
→ Buyer
→ Smart Logistics
→ Delivery

Do not use a generic stock-photo-heavy hero.

Landing page sections:

1. Problem

Explain that multiple intermediaries can reduce farmer market access and increase consumer prices.

2. Our Solution

Explain:

- Digital marketplace
- Direct buyer access
- Product listings
- Order management
- Demand forecasting
- Compatible order grouping
- Vehicle/driver matching
- Route planning
- Delivery visibility

3. How It Works

Farmer/FPO
→ List Produce
→ Buyer Orders
→ Farmer Accepts
→ Group Orders
→ Match Vehicle
→ Plan Route
→ Deliver

4. AI Demand Intelligence

Historical Orders
→ Demand Forecast
→ Future Demand Insight
→ Supply Planning

Clearly label this as a planned/demo forecasting flow.

5. Benefits

- Better market access
- Better supply planning
- Coordinated logistics
- Improved transparency
- Potential reduction in unnecessary transportation

Do not present these as guaranteed outcomes.

6. CTA

Enter the Marketplace

==================================================
LOGIN AND REGISTRATION
==================================================

Create a professional login page.

Fields:

- Email/mobile
- Password
- Role selector

Roles:

- Farmer/FPO
- Buyer
- Driver
- Admin

Buttons:

- Login
- Continue with demo account

Also include:

- Forgot password UI
- Register link
- Demo credentials section
- Clear DEMO MODE label

Demo accounts:

Farmer:
farmer@demo.com

Buyer:
buyer@demo.com

Driver:
driver@demo.com

Admin:
admin@demo.com

For the prototype, any password may work or use:

demo123

Clicking login must route to the correct role dashboard.

Create role-specific registration forms.

Farmer/FPO fields:

- Name
- Phone
- Email
- Password
- Village/City
- District
- State
- Farmer/FPO selection

Buyer fields:

- Name/business name
- Phone
- Email
- Password
- Location
- Buyer type

Driver fields:

- Name
- Phone
- Email
- License number
- Vehicle information

Include validation and success states.

==================================================
FARMER/FPO DASHBOARD
==================================================

Header:

Good morning, Rajesh

Cards:

- Active Listings
- Pending Orders
- Accepted Orders
- Available Produce
- Expected Demand
- Upcoming Deliveries

Include a Demand Snapshot card.

Demo example:

Tomato
Current listed supply: 850 kg
Predicted demand next week: 1,050 kg
Trend: Increasing

Clearly label the prediction as:

Demo Forecast

Do not present it as a real connected model.

Recent Orders table columns:

- Order ID
- Buyer
- Product
- Quantity
- Location
- Date
- Status
- Actions

Statuses:

- Pending
- Accepted
- Rejected
- Preparing
- In Transit
- Delivered

Quick actions:

- Add Product
- View Orders
- View Demand Forecast
- View Deliveries

==================================================
FARMER PRODUCT MANAGEMENT
==================================================

Create a polished My Products page.

Features:

- Product cards/table
- Search
- Filter
- Sort
- Add product
- Edit product
- Delete product
- Availability toggle
- Success toast
- Empty state
- Loading state
- Error state

Product fields:

- Product name
- Category
- Quantity
- Unit
- Price
- Location
- Availability
- Harvest date
- Optional image

Demo products:

- Tomato
- Potato
- Onion
- Wheat
- Rice

Farmer listing demo:

Tomato
1,000 kg
₹25/kg
Patiala
Green Valley FPO

==================================================
FARMER ORDER MANAGEMENT
==================================================

Create an Orders page with tabs:

- All
- Pending
- Accepted
- Rejected
- Completed

Order details:

- Order ID
- Buyer
- Product
- Quantity
- Price
- Pickup location
- Delivery location
- Order date
- Expected delivery
- Status

For pending orders show:

Accept Order
Reject Order

When Accept Order is clicked:

- Update status to Accepted.
- Update all related dashboard counts.
- Show success toast.
- Make the order available for logistics grouping.

When Reject Order is clicked:

- Update status to Rejected.
- Show confirmation toast.

Clearly communicate that farmer approval happens before logistics planning.

==================================================
BUYER DASHBOARD
==================================================

Create a buyer dashboard with:

- Active orders
- Pending orders
- Completed orders
- Favorite products
- Recent purchases
- Notifications

Show:

Find Fresh Produce

Include:

- Search bar
- Categories
- Marketplace shortcut
- Order tracking shortcut

Categories:

- Vegetables
- Fruits
- Grains
- Pulses

==================================================
BUYER MARKETPLACE
==================================================

Create a polished agricultural marketplace.

It must not look like Amazon.

Product cards must show:

- Product image or agricultural visual
- Product name
- Farmer/FPO
- Location
- Available quantity
- Price
- Availability
- Demo verification indicator if used
- View Details button

Demo listing:

Tomatoes
₹25/kg
1,000 kg available
Patiala
Green Valley FPO

Filters:

- Crop
- Location
- Price range
- Quantity
- Seller/FPO

Sorting:

- Price
- Distance
- Availability

Use realistic demo data for:

- Patiala
- Chandigarh
- Ambala
- Kurukshetra
- Ludhiana
- Karnal

==================================================
PRODUCT DETAILS AND ORDER CREATION
==================================================

Create a detailed product page.

Show:

- Product image
- Product name
- Farmer/FPO
- Location
- Quantity available
- Price per unit
- Harvest date
- Availability
- Product information
- Seller information

Order section:

- Quantity selector
- Delivery location
- Order summary
- Total quantity
- Total price
- Place Order button

After clicking Place Order:

- Create a mock order.
- Show success confirmation.
- Show Order Placed state.
- Update buyer dashboard counts.
- Make the order visible to the farmer.

Do not add real payment processing.

==================================================
BUYER ORDER TRACKING
==================================================

After an order is created, show:

Order placed successfully.

Timeline:

Order Placed
↓
Waiting for Farmer
↓
Accepted
↓
Delivery Planned
↓
In Transit
↓
Delivered

Use clear icons and labels, not color alone.

==================================================
DRIVER DASHBOARD
==================================================

Create a dedicated driver dashboard.

Show:

- Today’s deliveries
- Assigned delivery batches
- Total distance
- Delivery status
- Vehicle information
- Driver availability

Demo data:

Vehicle:
HR-XX-1234

Capacity:
1,000 kg

Current assignment:
700 kg

Driver statuses:

- Available
- Assigned
- On Route

==================================================
SMART LOGISTICS DASHBOARD
==================================================

This is one of the most important SIH screens.

Create a Smart Logistics page.

Show accepted orders:

Order #1001
300 kg
Chandigarh

Order #1002
400 kg
Ambala

Order #1003
200 kg
Kurukshetra

Create a Compatible Orders section.

Explain that grouping may be considered when:

- Pickup locations are the same or nearby.
- Delivery locations are compatible.
- Vehicle capacity is sufficient.
- Delivery constraints allow consolidation.

Add button:

Group Compatible Orders

When clicked, create:

Delivery Batch #DB-001

Total quantity:
700 kg

Orders:
#1001
#1002

Pickup:
Patiala

Deliveries:
Chandigarh
Ambala

Show success toast and update the interface.

==================================================
VEHICLE AND DRIVER MATCHING
==================================================

Create a Vehicle & Driver Matching page or section.

Vehicles:

Vehicle A
Capacity: 500 kg
Status: Unavailable

Vehicle B
Capacity: 1,000 kg
Status: Available

Vehicle C
Capacity: 2,000 kg
Status: Available

Drivers:

- Amit Kumar — Available
- Harpreet Singh — Assigned
- Sandeep Kumar — Available

Use transparent rule-based matching.

Factors:

- Vehicle capacity
- Driver availability
- Pickup proximity
- Delivery compatibility

Do not label this as machine learning.

Recommended result:

Recommended Vehicle:
Vehicle B

Recommended Driver:
Amit Kumar

Reason:

Capacity is sufficient for the grouped 700 kg load and the vehicle is currently available near the pickup location.

Label the result:

Demo Rule-Based Recommendation

Allow the user to assign the vehicle and driver.

==================================================
ROUTE OPTIMIZATION
==================================================

Create a Route Optimization screen.

Use a map-style visual placeholder. It does not need a live map API.

Show:

Pickup:
Patiala

Delivery 1:
Chandigarh

Delivery 2:
Ambala

Route:

Patiala
↓
Chandigarh
↓
Ambala

Summary cards:

- Total Distance: 126 km
- Estimated Travel Time: 3h 20m
- Total Load: 700 kg
- Number of Stops: 2

Clearly label:

Demo Route

Add explanatory text:

A real routing API or OR-Tools service can be connected later.

Do not present the route as live or AI-calculated.

==================================================
DELIVERY TRACKING
==================================================

Create a delivery tracking page.

Show:

- Delivery Batch ID
- Driver
- Vehicle
- Total load
- Pickup
- Stops
- Current status

Timeline:

Assigned
↓
Picked Up
↓
In Transit
↓
Delivered

Buttons:

- Mark Picked Up
- Start Delivery
- Mark Delivered

When clicked:

- Update status globally.
- Update timeline visually.
- Show confirmation toast.
- Reflect the state on driver and admin pages.

==================================================
DEMAND FORECASTING
==================================================

Create a Demand Forecast page for Farmer/FPO and Admin.

Controls:

- Product selector: Tomato, Potato, Onion, Wheat, Rice
- Location selector
- Time range selector

Chart:

- Historical demand
- Predicted demand

Use demo data only.

Demo metrics:

Tomato
Current weekly demand: 900 kg
Predicted next week: 1,050 kg
Trend: Increasing
Forecast error: 8.7%

Clearly mark:

Demo Forecast

Include this explanation:

Historical order patterns can be used to estimate future demand and support supply planning.

Do not claim a live connected model or guaranteed accuracy.

==================================================
FORECAST FLOW VISUAL
==================================================

Create a professional visual diagram:

Historical Orders
↓
Data Processing
↓
Demand Forecasting
↓
Predicted Future Demand
↓
Supply / Demand Insight
↓
Farmer/FPO Planning

==================================================
ADMIN DASHBOARD
==================================================

Create an admin analytics dashboard.

Cards:

- Total Farmers/FPOs
- Total Buyers
- Active Listings
- Active Orders
- Pending Deliveries
- Active Drivers

Charts:

- Orders over time
- Most ordered crops
- Regional order distribution
- Demand forecast
- Delivery activity

Tables:

- Recent orders
- High-demand crops
- Active delivery batches

Admin sections:

- Farmers
- Buyers
- Products
- Orders
- Vehicles
- Drivers
- Logistics
- Forecasts
- Settings

Add a Demo Data Reset button.

==================================================
NOTIFICATIONS
==================================================

Create a notification center.

Farmer notifications:

- New order received
- Order accepted
- Delivery scheduled
- Demand expected to increase

Buyer notifications:

- Order accepted
- Delivery planned
- Order dispatched
- Order delivered

Driver notifications:

- New delivery assigned
- Route updated

Use realistic demo notifications and unread counts.

==================================================
DEMO DATA
==================================================

Use realistic Indian agricultural demo data.

Locations:

- Patiala
- Chandigarh
- Ambala
- Kurukshetra
- Ludhiana
- Karnal

Crops:

- Tomato
- Potato
- Onion
- Wheat
- Rice

Use realistic quantities and prices.

Do not leave dashboards empty.

==================================================
CRITICAL SIH DEMONSTRATION SCENARIO
==================================================

The entire application must support this scenario:

1. Login as Farmer.

2. Farmer lists:

Tomato
1,000 kg
₹25/kg
Patiala

3. Login as Buyer A.

4. Buyer A places an order:

300 kg
Delivery:
Chandigarh

5. Login as Farmer.

6. Farmer accepts the order.

7. Login as Buyer B.

8. Buyer B places an order:

400 kg
Delivery:
Ambala

9. Login as Farmer.

10. Farmer accepts the second order.

11. Open Smart Logistics.

12. Show multiple accepted orders.

13. Click Group Compatible Orders.

14. Create:

Delivery Batch #DB-001
Total:
700 kg

15. Open Vehicle & Driver Matching.

16. Recommend:

Vehicle B
Capacity:
1,000 kg

Driver:
Amit Kumar

17. Open Route Optimization.

18. Show:

Patiala → Chandigarh → Ambala

19. Open Delivery Tracking.

20. Update:

Assigned → Picked Up → In Transit → Delivered

21. Open Demand Forecast.

22. Show:

Historical demand → predicted future demand

This workflow must be easy to demonstrate within a few minutes during the SIH presentation.

==================================================
COMPONENT ARCHITECTURE
==================================================

Create reusable components instead of duplicating UI.

Recommended components:

- Navbar
- Sidebar
- MobileDrawer
- DashboardCard
- ProductCard
- ProductForm
- ProductDetails
- OrderTable
- OrderStatusBadge
- OrderTimeline
- SearchBar
- FilterPanel
- ChartCard
- DemandForecastChart
- ForecastFlow
- DeliveryCard
- VehicleCard
- DriverCard
- RouteSummary
- NotificationPanel
- Modal
- Toast
- EmptyState
- LoadingState
- ErrorState

==================================================
FRONTEND ARCHITECTURE
==================================================

Use a clean React architecture.

Suggested structure:

src/
  components/
  pages/
  layouts/
  hooks/
  services/
  data/
  types/
  utils/
  context/

Keep mock data separate from UI components.

Create service abstractions:

- products service
- orders service
- logistics service
- forecast service
- notifications service

The mock services should be replaceable later with Supabase or API calls.

==================================================
STATE MANAGEMENT
==================================================

Use React Context or an equivalent simple state system.

The following must update during the current session:

- Add product
- Edit product
- Delete product
- Toggle availability
- Create buyer order
- Accept order
- Reject order
- Group accepted orders
- Create delivery batch
- Assign vehicle
- Assign driver
- Update delivery status
- Update route status
- Reset demo data

Reflect updates across dashboards.

==================================================
RESPONSIVENESS
==================================================

Desktop:

- Professional sidebar layout
- Multi-column dashboard cards
- Full tables and charts

Tablet:

- Responsive cards
- Adapted tables
- Collapsible navigation

Mobile:

- Collapsible sidebar/drawer
- Stacked cards
- Horizontal table scrolling
- Touch-friendly buttons
- Responsive forms
- Farmer experience optimized for mobile

==================================================
ACCESSIBILITY
==================================================

Ensure:

- Good color contrast
- Keyboard-friendly controls
- Meaningful labels
- Accessible buttons
- Form validation
- Clear status text
- Status is not communicated by color alone
- Images have alt text
- Focus states are visible

==================================================
EMPTY, LOADING, ERROR, AND SUCCESS STATES
==================================================

Every major screen must include suitable states:

- Loading state
- Empty state
- Error state
- Success feedback
- Confirmation modal where needed

Examples:

No pending orders
No active deliveries
No products found
Unable to load demo data
Product added successfully
Order accepted successfully

Do not leave blank sections.

==================================================
SECURITY UI PREPARATION
==================================================

Prepare the interface for future:

- JWT or Supabase authentication
- Protected routes
- Role-based access
- Admin-only pages
- Farmer-owned product access
- Buyer-specific orders
- Driver-specific deliveries

This is a frontend prototype. Do not claim that production security has been implemented.

==================================================
FUTURE INTEGRATIONS
==================================================

Structure the frontend so it can later connect to:

Authentication:
JWT or Supabase Auth

Database:
PostgreSQL or Supabase

Backend:
FastAPI

AI:
Python, Pandas, NumPy, Scikit-learn

Optimization:
Google OR-Tools

Maps:
OpenStreetMap and a routing service

Do not require these integrations for the first version.

==================================================
WHAT NOT TO BUILD
==================================================

Do not build:

- Cryptocurrency
- Blockchain
- NFT
- IoT hardware
- Drone management
- Computer vision
- Facial recognition
- Voice assistant
- Complex payment gateway
- Generic AI chatbot
- Fake live GPS
- Fake traffic data
- Fake AI confidence scores
- Unrelated social media features

Only build features relevant to SIH26033.

==================================================
FINAL QUALITY CHECK
==================================================

Before finishing:

- Check every route works.
- Check role-based navigation works.
- Check buttons work.
- Check forms work.
- Check mock data displays correctly.
- Check dashboards are not empty.
- Check responsive layouts.
- Check no console errors.
- Check no broken imports.
- Check no placeholder lorem ipsum remains.
- Check all role-specific routes.
- Check order status updates.
- Check product creation.
- Check product editing and deletion.
- Check grouping demo.
- Check vehicle matching demo.
- Check driver assignment.
- Check route demo.
- Check delivery status updates.
- Check demand forecast demo.
- Check uploaded khetsetu.jpg appears correctly.
- Check DEMO MODE is visible.
- Check admin reset works.

Do not stop after creating only the landing page.

Generate the complete coherent frontend application.

Priority order:

1. Correct business flow
2. SIH demo readiness
3. Excellent UX
4. Visual polish
5. Reusable architecture
6. Easy future backend and AI integration

After implementation, provide:

- List of implemented routes
- Demo login credentials
- Short SIH presentation walkthrough
- Any remaining mock-only limitations

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f5b68397-eb83-4863-a183-072f14eb555e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
