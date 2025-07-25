import Loading from '@/app/loading';
import { useChatHandler } from '@/components/chat/chat-hooks/use-chat-handler';
import { PentestGPTContext } from '@/context/context';
import useHotkey from '@/lib/hooks/use-hotkey';
import {
  IconInfoCircle,
  IconMessageOff,
  IconRefresh,
} from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import {
  type FC,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { WithTooltip } from '../ui/with-tooltip';
import { ChatHelp } from './chat-help';
import { useScroll } from './chat-hooks/use-scroll';
import { ChatInput } from './chat-input';
import { ChatMessages } from './chat-messages';
import { ChatScrollButtons } from './chat-scroll-buttons';
import { ChatSecondaryButtons } from './chat-secondary-buttons';
import { ChatSettings } from './chat-settings';
import { GlobalDeleteChatDialog } from './global-delete-chat-dialog';
import { Settings } from '../utility/settings';
// import { ShareChatButton } from './chat-share-button';
import { useUIContext } from '@/context/ui-context';
import { ChatContinueButton } from './chat-continue-button';
import { AgentSidebar } from '../messages/terminal-messages/agent-sidebar';
import { useAgentSidebar } from '@/components/chat/chat-hooks/use-agent-sidebar';

export const ChatUI: FC = () => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useHotkey('o', () => handleNewChat());
  useHotkey('Backspace', () => {
    if (selectedChat) {
      setIsDeleteDialogOpen(true);
    }
  });

  const params = useParams();

  const {
    chatMessages,
    selectedChat,
    isTemporaryChat,
    setTemporaryChatMessages,
    fetchMessages,
    fetchChat,
    loadMoreMessages,
    isLoadingMore,
    messagesIsDone,
  } = useContext(PentestGPTContext);

  const { isMobile, isGenerating, setIsReadyToChat } = useUIContext();

  const {
    handleNewChat,
    handleFocusChatInput,
    handleSendContinuation,
    handleSendTerminalContinuation,
  } = useChatHandler();

  const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useScroll();

  const { agentSidebar } = useAgentSidebar();

  const [loading, setLoading] = useState(true);
  const previousHeightRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isTemporaryChat) {
        await Promise.all([
          fetchMessages(params.chatid as string),
          fetchChat(params.chatid as string),
        ]);
      }
    };

    if (
      !isTemporaryChat &&
      ((chatMessages?.length === 0 && !params.chatid) || params.chatid)
    ) {
      setIsReadyToChat(false);
      fetchData().then(() => {
        handleFocusChatInput();
        setLoading(false);
        setIsReadyToChat(true);
        scrollToBottom({ instant: true, force: true });
      });
    } else {
      setLoading(false);
      setIsReadyToChat(true);
    }
  }, []);

  const loadMoreMessagesInner = useCallback(async () => {
    if (
      isTemporaryChat ||
      messagesIsDone ||
      isLoadingMore ||
      !chatMessages.length
    )
      return;

    const chatId = params.chatid as string;

    if (!chatId) {
      console.error('Chat ID is undefined');
      return;
    }

    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      previousHeightRef.current = scrollContainer.scrollHeight;
    }

    loadMoreMessages(chatId);
  }, [
    isTemporaryChat,
    messagesIsDone,
    isLoadingMore,
    chatMessages,
    loadMoreMessages,
    params.chatid,
    scrollRef,
  ]);

  useLayoutEffect(() => {
    if (isLoadingMore) {
      setTimeout(() => {
        const scrollContainer = scrollRef.current;
        if (scrollContainer && previousHeightRef.current !== null) {
          const newHeight = scrollContainer.scrollHeight;
          const previousHeight = previousHeightRef.current;
          const scrollDifference = newHeight - previousHeight;

          // console.log("newHeight", newHeight)
          // console.log("previousHeight", previousHeight)
          // console.log("scrollDifference", scrollDifference)
          // console.log("scrollContainer.scrollTop", scrollContainer.scrollTop)
          // Adjust scroll position
          scrollContainer.scrollTop = scrollDifference;
          // Reset previousHeightRef for next load
          previousHeightRef.current = null;
        }
      }, 200); // allow some time for the new messages to render
    }
  }, [chatMessages, isLoadingMore, scrollRef]);

  const innerHandleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop } = e.currentTarget;

      if (scrollTop === 0) {
        loadMoreMessagesInner();
      }
    },
    [loadMoreMessagesInner],
  );

  const handleCleanChat = () => {
    setTemporaryChatMessages([]);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="relative flex h-full flex-col items-center">
      {!isTemporaryChat ? (
        <div className="absolute right-[22px] top-2 flex h-[40px] items-center space-x-3">
          {!isMobile ? (
            <>
              {/* <ShareChatButton variant="chatUI" /> */}
              <WithTooltip
                display={<div>Settings</div>}
                trigger={<Settings />}
              />
            </>
          ) : (
            <ChatSecondaryButtons />
          )}
        </div>
      ) : (
        <div className="absolute right-[22px] top-2 flex h-[40px] items-center space-x-3">
          {isMobile ? (
            <WithTooltip
              display={isTemporaryChat ? 'Clear chat' : 'New chat'}
              trigger={
                isTemporaryChat && (
                  <IconRefresh
                    className="cursor-pointer hover:opacity-50"
                    size={24}
                    onClick={handleCleanChat}
                  />
                )
              }
              side="bottomRight"
            />
          ) : (
            <WithTooltip display={<div>Settings</div>} trigger={<Settings />} />
          )}
        </div>
      )}

      {isTemporaryChat && (
        <div className="absolute left-1/2 top-4 hidden -translate-x-1/2 md:block">
          <div className="text-muted-foreground flex items-center gap-1 space-x-1 px-2 py-1 text-sm">
            <IconMessageOff size={16} />
            <span>Temporary Chat</span>
            <WithTooltip
              delayDuration={300}
              side="bottom"
              display={
                <div className="max-w-[300px] text-center">
                  Temporary chats won&apos;t appear in your history, and
                  PentestGPT won&apos;t retain any information from these
                  conversations.
                </div>
              }
              trigger={<IconInfoCircle size={16} />}
            />
          </div>
        </div>
      )}

      <div className="flex size-full flex-col">
        <ChatSettings handleCleanChat={handleCleanChat} />

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
          {/* Chat messages container */}
          <div
            className={`relative flex h-[45%] flex-1 flex-col overflow-hidden lg:h-auto ${
              agentSidebar.isOpen ? 'lg:w-1/2' : 'lg:w-full'
            }`}
          >
            {/* Chat messages */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col overflow-auto"
              onScroll={innerHandleScroll}
            >
              <div ref={contentRef}>
                <ChatMessages />
              </div>
            </div>

            {/* Scroll buttons and continuation button */}
            <div className="relative w-full items-end">
              <div className="absolute -top-10 left-1/2 flex -translate-x-1/2 justify-center">
                <ChatScrollButtons
                  isAtBottom={isAtBottom}
                  scrollToBottom={scrollToBottom}
                />
              </div>

              <ChatContinueButton
                isGenerating={isGenerating}
                finishReason={selectedChat?.finish_reason}
                onTerminalContinue={handleSendTerminalContinuation}
                onContinue={handleSendContinuation}
              />
            </div>

            <ChatInput />
            <ChatHelp />
          </div>

          {/* Agent Sidebar */}
          {agentSidebar.isOpen && (
            <div
              className={`${
                isMobile
                  ? 'fixed inset-0 z-50 bg-background'
                  : 'relative flex h-[45%] flex-1 flex-col overflow-hidden lg:h-auto lg:w-1/2'
              }`}
            >
              <AgentSidebar />
            </div>
          )}
        </div>
      </div>

      <GlobalDeleteChatDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </div>
  );
};
