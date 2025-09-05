import { createBrowserRouter } from 'react-router-dom'
import Main from '../layouts/Main'
import Home from '../pages/Home/Home'
import ErrorPage from '../pages/ErrorPage'
import Login from '../pages/Login/Login'
import SignUp from '../pages/SignUp/SignUp'
import RoomDetails from '../pages/RoomDetails/RoomDetails'
import PrivateRoute from './PrivateRoute'
import DashboardLayout from '../layouts/DashboardLayout'
import Sidebar from '../components/Dashboard/Sidebar/Sidebar'
import Statics from '../components/Dashboard/Common/Statics'
import AddRoom from '../components/Dashboard/Hoast/AddRoom'
import MyListing from '../components/Dashboard/Hoast/MyListing'
import Profile from '../components/Dashboard/Common/Profile'
import ManageUser from '../components/Dashboard/Admin/ManageUser'
import AdminRoute from './AdminRoute'
import HostMenu from '../components/Dashboard/Sidebar/Menu/HostMenu'
import MyBookings from '../components/Dashboard/Guest/MyBooking'
import HostRoute from './HostRoute'
import ManageBookings from '../components/Dashboard/Hoast/MangaeBooking'


export const router = createBrowserRouter([
  {
    path: '/',
    element: <Main />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/room/:id',
        element: <PrivateRoute><RoomDetails /></PrivateRoute>,
      },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <SignUp /> },
  { 
    path:('/dashboard'),
    element:<PrivateRoute><DashboardLayout/></PrivateRoute>,
    children:[
      {
         // index: true can be use 
        path:'/dashboard',
       
        element:<PrivateRoute><Statics></Statics></PrivateRoute>
      },
      {
        path:'addroom',
        element:<PrivateRoute><HostMenu><AddRoom></AddRoom></HostMenu></PrivateRoute>
      },
      {
        path:'my-listing',
        element:<PrivateRoute><MyListing></MyListing></PrivateRoute>
      },
      {
        path:'manage-users',
        element:<PrivateRoute><AdminRoute><ManageUser/></AdminRoute></PrivateRoute>
      },
      {
         path:'my-bookings',
         element:<PrivateRoute><MyBookings/></PrivateRoute>
      },{
         path:'manage-bookings',
         element:<PrivateRoute>
          <HostRoute>
            <ManageBookings/>
          </HostRoute>
         </PrivateRoute>
      },
      {
        path:'profile',
        element:<PrivateRoute><Profile/></PrivateRoute>
      }
    ]
   
    
   },
])
