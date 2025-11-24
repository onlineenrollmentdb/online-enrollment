import { useEffect } from 'react';
import socket from '../socket';
import { useToast } from '../context/ToastContext';

export default function SocketListener() {
	const { addToast } = useToast();

	useEffect(() => {
		socket.on("connect", () => {
			console.log("✅ Connected to WebSocket server:", socket.id);
		});

		socket.on("disconnect", () => {
			console.log("❌ Disconnected from WebSocket server");
		});

		socket.on("newEnrollment", (data) => {
			console.log("📢 New enrollment:", data);
			addToast(`📚 ${data.message}`);
		});

		socket.on("enrollmentStatusUpdate", (data) => {
			console.log("📢 Enrollment status updated:", data);
			addToast(`🔄 Status updated for student ${data.student_id}`);
		});

		socket.on("notification", (data) => {
			console.log("🔔 Notification received:", data);
			addToast(`🔔 ${data.title}: ${data.message}`);
		});

		return () => {
			socket.off("connect");
			socket.off("disconnect");
			socket.off("newEnrollment");
			socket.off("enrollmentStatusUpdate");
			socket.off("notification");
		};
	}, [addToast]);

	return null; // ✅ doesn't render anything, just listens
}
