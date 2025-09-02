import { FaUserCog } from 'react-icons/fa'
import MenuItem from '../../../../hooks/MenuItem'


const AdminMenu = () => {
  return (
    <>
      <MenuItem icon={FaUserCog} label='Manage Users' address='manage-users' />
    </>
  )
}

export default AdminMenu