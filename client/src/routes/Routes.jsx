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
    element:<DashboardLayout/>,
    children:[
      {
         // index: true can be use 
        path:'/dashboard',
       
        element:<Statics></Statics>
      },
      {
        path:'addroom',
        element:<AddRoom></AddRoom>
      },
      {
        path:'mylisting',
        element:<MyListing></MyListing>
      },
      {
        path:'manage-users',
        element:<ManageUser/>
      },
      {
        path:'profile',
        element:<Profile/>
      }
    ]
   
    
   },
])
