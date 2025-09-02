import { useState } from "react";
import useAuth from "./useAuth";
import { useQuery } from "@tanstack/react-query";
import { axiosSecure } from "./useAxiosSecure";



const UseRole = () => {
    const {user,loading}=useAuth();
    const {data:role="",isLoading}=useQuery({
        queryKey:['role',user?.email],
        enabled:!loading && !!user?.email,
        queryFn:async()=>{
            const {data}=await axiosSecure.get(`/user/${user?.email}`)
            return data.role
        }
    })
    return [role,isLoading]
};

export default UseRole;