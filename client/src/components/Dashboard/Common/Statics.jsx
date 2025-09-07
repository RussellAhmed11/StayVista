import UseRole from "../../../hooks/UseRole";
import LoadingSpinner from "../../Shared/LoadingSpinner";
import AdminStatistics from "../Admin/AdminStatistics";
import GuestStatistics from "../Guest/GuestStatistics";
import HostStatistics from "../Hoast/HostStatistics";

const Statics = () => {
    const [role,isLoading]=UseRole()
    if(isLoading) return <LoadingSpinner/>
    return (
        <>
                {
                    role==='admin' && <AdminStatistics/>
                }
               
                {
                    role==='host' && <HostStatistics/>
                }
               
                {
                    role==='guest' && <GuestStatistics/>
                }
               
        </>
    );
};

export default Statics;