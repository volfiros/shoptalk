import { ChatScreen } from "@/components/chat/chat-screen";
import { DEFAULT_DEMO_USER_ID, listRecentOrders } from "@/lib/support/service";

const ChatPage = () => {
  const recentOrders = listRecentOrders(DEFAULT_DEMO_USER_ID);

  return <ChatScreen orderCount={recentOrders.length} />;
};

export default ChatPage;
