import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
export default axiosInstance;
