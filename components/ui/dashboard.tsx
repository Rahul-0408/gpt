'use client';

import { handleFileUpload } from '@/components/chat/chat-helpers/file-upload';
import { Sidebar } from '@/components/sidebar/sidebar';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { PentestGPTContext } from '@/context/context';
import useHotkey from '@/lib/hooks/use-hotkey';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types';
import { IconFileFilled, IconLayoutSidebar } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import {
  type FC,
  useContext,
  useCallback,
  useRef,
  useState,
  useMemo,
  useEffect,
} from 'react';
import { useSelectFileHandler } from '@/components/chat/chat-hooks/use-select-file-handler';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { useUIContext } from '@/context/ui-context';
import { WithTooltip } from './with-tooltip';
import { PLUGINS_WITHOUT_IMAGE_SUPPORT } from '@/types/plugins';

const DynamicKeyboardShortcutsPopup = dynamic(
  () => import('../chat/keyboard-shortcuts-popup'),
  { ssr: false },
);

export const SIDEBAR_WIDTH = 260;

interface DashboardProps {
  children: React.ReactNode;
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  const {
    isPremiumSubscription,
    contentType,
    setContentType,
    newMessageImages,
    newMessageFiles,
  } = useContext(PentestGPTContext);
  const {
    isReadyToChat,
    isMobile,
    showSidebar,
    setShowSidebar,
    selectedPlugin,
    setIsSearchOpen,
    isKeyboardShortcutsOpen,
    setIsKeyboardShortcutsOpen,
  } = useUIContext();

  const searchParams = useSearchParams();
  const tabValue = searchParams.get('tab') || 'chats';

  useEffect(() => {
    setContentType(tabValue as ContentType);
  }, []);

  const { handleSelectDeviceFile } = useSelectFileHandler();
  const [isDragging, setIsDragging] = useState(false);

  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useHotkey('s', () => setShowSidebar((prev) => !prev));
  useHotkey('/', () => setIsKeyboardShortcutsOpen((prev) => !prev), {
    shiftKey: false,
  });
  useHotkey('k', () => setIsSearchOpen((prev) => !prev), {
    ctrlKey: true,
    shiftKey: false,
  });

  const handleOverlayClick = useCallback(() => {
    if (isMobile && showSidebar) {
      setShowSidebar(false);
    }
  }, [isMobile, showSidebar, setShowSidebar]);

  const renderContent = () => {
    switch (contentType) {
      case 'chats':
      default:
        return children;
    }
  };

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!isReadyToChat) {
      setIsDragging(false);
      return;
    }

    // Check if the active plugin doesn't support images
    if (
      selectedPlugin &&
      PLUGINS_WITHOUT_IMAGE_SUPPORT.includes(selectedPlugin)
    ) {
      toast.error('Images are not allowed when using this feature');
      setIsDragging(false);
      return;
    }

    const items = event.dataTransfer.items;
    const files: File[] = [];

    if (items && isPremiumSubscription) {
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      handleFileUpload(
        files,
        handleSelectDeviceFile,
        newMessageImages,
        newMessageFiles,
      );
    }

    if (items.length > 5) {
      toast.error('Maximum of 5 files can be dropped at a time.');
    }

    setIsDragging(false);
  };

  const isDraggingEnabled = isReadyToChat && isPremiumSubscription;

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleToggleSidebar = () => {
    setShowSidebar((prevState) => !prevState);
  };

  const sidebarStyle = useMemo(
    () => ({
      minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : '0px',
      maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : '0px',
      width: showSidebar ? `${SIDEBAR_WIDTH}px` : '0px',
    }),
    [showSidebar],
  );

  return (
    <div className="flex size-full">
      {!showSidebar && (
        <WithTooltip
          display={'Open sidebar'}
          trigger={
            <Button
              ref={toggleButtonRef}
              className={cn(
                'fixed left-[16px] z-50 size-[32px] cursor-pointer',
                showSidebar && isMobile ? 'top-1/2' : 'top-3',
              )}
              variant="ghost"
              size="icon"
              onClick={handleToggleSidebar}
            >
              <IconLayoutSidebar size={24} />
            </Button>
          }
          side="bottomRight"
        />
      )}

      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs dark:bg-black/80"
          onClick={handleOverlayClick}
        />
      )}

      <div
        className={cn(
          'bg-tertiary h-full duration-200',
          isMobile ? 'fixed z-50' : 'relative',
        )}
        style={sidebarStyle}
      >
        {showSidebar && (
          <Tabs className="flex h-full" value={contentType}>
            <Sidebar contentType={contentType} showSidebar={showSidebar} />
          </Tabs>
        )}
      </div>

      {isKeyboardShortcutsOpen && (
        <DynamicKeyboardShortcutsPopup
          isOpen={isKeyboardShortcutsOpen}
          onClose={() => setIsKeyboardShortcutsOpen(false)}
        />
      )}

      <div
        className={cn(
          'bg-background flex min-w-0 flex-1 flex-col',
          isDraggingEnabled && 'drag-drop-zone',
        )}
        {...(isDraggingEnabled
          ? {
              onDrop: onFileDrop,
              onDragOver: onDragOver,
              onDragEnter: handleDragEnter,
              onDragLeave: handleDragLeave,
            }
          : {})}
      >
        {isDraggingEnabled && isDragging ? (
          <div className="flex h-full items-center justify-center bg-black/50 text-2xl text-white">
            <div className="flex flex-col items-center rounded-lg p-4">
              <IconFileFilled size={48} className="mb-2 text-white" />
              <span className="text-center text-lg font-semibold text-white">
                Drop your files here to add it to the conversation
              </span>
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};
