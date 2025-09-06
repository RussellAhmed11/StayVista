
import UseRole from '../hooks/UseRole';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types'
const AdminRoute = ({children}) => {
    const [role,isLoading]=UseRole();
    if(isLoading) return <LoadingSpinner/>
    if(role ==='admin') return children
    return <Navigate to='/dashboard'/>;
};
AdminRoute.propTypes = {
  children: PropTypes.element,
}
export default AdminRoute;
