import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "../lib/axios";
import { Users, Package, ShoppingCart, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

const AnalyticsTab = () => {
	const [analyticsData, setAnalyticsData] = useState({
		users: 0,
		products: 0,
		totalSales: 0,
		totalRevenue: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [dailySalesData, setDailySalesData] = useState([]);

	useEffect(() => {
		const fetchAnalyticsData = async () => {
			try {
				const response = await axios.get("/analytics");
				setAnalyticsData(response.data.analyticsData);
				setDailySalesData(response.data.dailySalesData);
			} catch (error) {
				console.error("Error fetching analytics data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAnalyticsData();
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-blue-400 text-lg">Loading analytics...</div>
			</div>
		);
	}

	// Transform data for the chart (convert date to name for recharts)
	const chartData = dailySalesData.map(item => ({
		name: item.date || item._id || 'Unknown',
		sales: item.sales || 0,
		revenue: item.revenue || 0
	}));

	// Custom tooltip formatter
	const formatTooltip = (value, name) => {
		if (name === 'revenue') {
			return [`₹${value.toFixed(2)}`, 'Revenue'];
		}
		return [value, name === 'sales' ? 'Sales' : name];
	};

	return (
		<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
				<AnalyticsCard
					title='Total Users'
					value={analyticsData.users.toLocaleString()}
					icon={Users}
					color='from-blue-500 to-blue-700'
				/>
				<AnalyticsCard
					title='Total Products'
					value={analyticsData.products.toLocaleString()}
					icon={Package}
					color='from-blue-500 to-blue-700'
				/>
				<AnalyticsCard
					title='Total Sales'
					value={analyticsData.totalSales.toLocaleString()}
					icon={ShoppingCart}
					color='from-blue-500 to-blue-700'
				/>
				<AnalyticsCard
					title='Total Revenue'
					value={`₹${analyticsData.totalRevenue.toLocaleString()}`}
					icon={DollarSign}
					color='from-blue-500 to-blue-700'
				/>
			</div>

			{/* Sales and Revenue Chart */}
			<motion.div
				className='bg-gray-800/60 rounded-lg p-6 shadow-lg border border-blue-700'
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.25 }}
			>
				<h3 className="text-xl font-semibold text-white mb-4 text-center">Last 7 Days Sales & Revenue</h3>
				
				{chartData.length > 0 ? (
					<ResponsiveContainer width='100%' height={400}>
						<LineChart data={chartData}>
							<CartesianGrid strokeDasharray='3 3' stroke="#374151" />
							<XAxis 
								dataKey='name' 
								stroke='#D1D5DB' 
								tick={{ fill: '#D1D5DB' }}
								axisLine={{ stroke: '#6B7280' }}
							/>
							<YAxis 
								yAxisId='left' 
								stroke='#10B981' 
								tick={{ fill: '#10B981' }}
								axisLine={{ stroke: '#6B7280' }}
								label={{ value: 'Sales Count', angle: -90, position: 'insideLeft', fill: '#10B981' }}
							/>
							<YAxis 
								yAxisId='right' 
								orientation='right' 
								stroke='#3B82F6' 
								tick={{ fill: '#3B82F6' }}
								axisLine={{ stroke: '#6B7280' }}
								label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', fill: '#3B82F6' }}
							/>
							<Tooltip 
								contentStyle={{ 
									backgroundColor: '#1F2937', 
									border: '1px solid #374151',
									borderRadius: '8px',
									color: '#F9FAFB'
								}}
								formatter={formatTooltip}
							/>
							<Legend />
							<Line
								yAxisId='left'
								type='monotone'
								dataKey='sales'
								stroke='#10B981'
								strokeWidth={3}
								activeDot={{ r: 8, fill: '#10B981' }}
								name='Sales'
								dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
							/>
							<Line
								yAxisId='right'
								type='monotone'
								dataKey='revenue'
								stroke='#3B82F6'
								strokeWidth={3}
								activeDot={{ r: 8, fill: '#3B82F6' }}
								name='Revenue'
								dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="text-gray-400 text-lg mb-2">No data available</div>
							<div className="text-gray-500 text-sm">Start making sales to see analytics</div>
						</div>
					</div>
				)}
			</motion.div>
		</div>
	);
};
export default AnalyticsTab;

const AnalyticsCard = ({ title, value, icon: Icon, color }) => (
	<motion.div
		className={`bg-gray-800 rounded-lg p-6 shadow-lg overflow-hidden relative ${color}`}
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ duration: 0.5 }}
	>
		<div className='flex justify-between items-center'>
			<div className='z-10'>
				<p className='text-blue-300 text-sm mb-1 font-semibold'>{title}</p>
				<h3 className='text-white text-3xl font-bold'>{value}</h3>
			</div>
		</div>
		<div className='absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-900 opacity-30' />
		<div className='absolute -bottom-4 -right-4 text-blue-800 opacity-50'>
			<Icon className='h-32 w-32' />
		</div>
	</motion.div>
);