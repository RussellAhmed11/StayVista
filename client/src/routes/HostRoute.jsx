import PropTypes from 'prop-types'
import UseRole from '../hooks/UseRole';
import LoadingSpinner from '../components/Shared/LoadingSpinner';
import { Navigate } from 'react-router-dom';

const HostRoute = ({children}) => {
    const [role,isLoading]=UseRole();
    if(isLoading) return <LoadingSpinner/>
    if(role ==='host') return children;
    return <Navigate to='/dashboard'/>;  
};

HostRoute.propTypes = {
  children: PropTypes.element,
}
export default HostRoute;
