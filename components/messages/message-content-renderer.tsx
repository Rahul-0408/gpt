import React, { useState, useMemo, useCallback, type FC } from 'react';
import { MessageMarkdown } from './message-markdown';
import { ReasoningMarkdown } from './reasoning-markdown';
import { CitationDisplay } from './citation-display';
import { MessageCitations } from './message-citations';
import { parseContent } from './terminal-messages/content-parser';
import { TerminalBlockComponent } from './terminal-messages/terminal-block';
import { FileContentBlockComponent } from './terminal-messages/file-content-block';
import { ShellWaitBlockComponent } from './terminal-messages/shell-wait-block';
import { InfoSearchWebBlockComponent } from './terminal-messages/info-search-web-block';
import { useUIContext } from '@/context/ui-context';
import { Atom, ChevronRight, ChevronDown } from 'lucide-react';

interface MessageContentRendererProps {
  content: string;
  citations?: string[];
  isAssistant: boolean;
  isLastMessage?: boolean;
  reasoningWithCitations?: boolean;
  thinking_content?: string;
  thinking_elapsed_secs?: number | null;
}

export const MessageContentRenderer: FC<MessageContentRendererProps> = ({
  content,
  citations = [],
  isAssistant,
  isLastMessage = false,
  reasoningWithCitations = false,
  thinking_content,
  thinking_elapsed_secs,
}) => {
  const { isGenerating } = useUIContext();

  const [closedBlocks, setClosedBlocks] = useState(() => new Set<number>());
  const [expandedOutputs, setExpandedOutputs] = useState(
    () => new Set<number>(),
  );
  const [thinkingClosed, setThinkingClosed] = useState(false);

  const toggleBlock = useCallback((index: number) => {
    setClosedBlocks((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  }, []);

  const toggleExpanded = useCallback((index: number) => {
    setExpandedOutputs((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  }, []);

  const toggleThinking = useCallback(() => {
    setThinkingClosed((prev) => !prev);
  }, []);

  const formatThinkingTime = (seconds: number | null | undefined) => {
    if (!seconds) return 'Thoughts...';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      return `Thought for ${seconds} seconds`;
    }

    if (remainingSeconds === 0) {
      return `Thought for ${minutes} minutes`;
    }

    return `Thought for ${minutes} minutes ${remainingSeconds} seconds`;
  };

  // Process content with citations if available
  const processedContent = useMemo(() => {
    if (citations.length === 0) return content;

    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const index = Number.parseInt(num) - 1;
      return citations[index] ? `[${num}](${citations[index]})` : match;
    });
  }, [content, citations]);

  const processedContentBlocks = useMemo(
    () => parseContent(processedContent),
    [processedContent],
  );

  // Check if content has any terminal-related XML tags
  const hasTerminalContent = useMemo(() => {
    return processedContentBlocks.some(
      (block) =>
        block.type === 'terminal' ||
        block.type === 'shell-wait' ||
        block.type === 'file-content' ||
        block.type === 'info-search-web',
    );
  }, [processedContentBlocks]);

  // Handle thinking content
  if (thinking_content) {
    const isThinking = isGenerating && !content;
    const thinkingTitle = isThinking
      ? 'Thinking...'
      : formatThinkingTime(thinking_elapsed_secs);

    return (
      <div>
        {/* Thinking Block */}
        <div className="mb-3 overflow-hidden">
          <button
            className="flex w-full items-center justify-between transition-colors duration-200"
            onClick={toggleThinking}
            aria-expanded={!thinkingClosed}
            aria-controls="thinking-content"
          >
            <div
              className={`flex items-center ${isThinking ? 'animate-pulse' : ''}`}
            >
              <Atom size={20} />
              <h4 className="text-muted-foreground ml-2 mr-1">
                {thinkingTitle}
              </h4>
              {thinkingClosed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </div>
          </button>

          {!thinkingClosed && (
            <div
              id="thinking-content"
              className="max-h-[12000px] opacity-100 transition-all duration-300 ease-in-out"
            >
              <div className="relative mt-4">
                {/* Vertical line */}
                <div className="bg-muted absolute inset-y-0 left-0 w-1 rounded-full" />
                <div className="pl-6 pr-4">
                  <MessageCitations
                    content={thinking_content}
                    isAssistant={isAssistant}
                    citations={citations}
                    reasoningWithCitations={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        {content &&
          (hasTerminalContent ? (
            // Render terminal content with citations
            <div>
              {processedContentBlocks.map((block, index) => (
                <React.Fragment key={index}>
                  {block.type === 'text' ? (
                    <MessageMarkdown
                      content={block.content as string}
                      isAssistant={isAssistant}
                    />
                  ) : block.type === 'terminal' ? (
                    <TerminalBlockComponent
                      block={block.content}
                      index={index}
                      isClosed={closedBlocks.has(index)}
                      isExpanded={expandedOutputs.has(index)}
                      onToggleBlock={toggleBlock}
                      onToggleExpanded={toggleExpanded}
                      totalBlocks={processedContentBlocks.length}
                      isLastMessage={isLastMessage}
                    />
                  ) : block.type === 'shell-wait' ? (
                    <ShellWaitBlockComponent block={block.content} />
                  ) : block.type === 'info-search-web' ? (
                    <InfoSearchWebBlockComponent block={block.content} />
                  ) : (
                    <FileContentBlockComponent
                      block={block.content}
                      index={index}
                    />
                  )}
                </React.Fragment>
              ))}
              {citations.length > 0 && (
                <CitationDisplay citations={citations} />
              )}
            </div>
          ) : // Render simple content with citations
          citations.length > 0 ? (
            <MessageCitations
              content={content}
              isAssistant={isAssistant}
              citations={citations}
              reasoningWithCitations={false}
            />
          ) : (
            <MessageMarkdown content={content} isAssistant={isAssistant} />
          ))}
      </div>
    );
  }

  // If no terminal content, render as simple citation message
  if (!hasTerminalContent) {
    return (
      <div>
        {reasoningWithCitations ? (
          <ReasoningMarkdown content={processedContent} />
        ) : (
          <MessageMarkdown
            content={processedContent}
            isAssistant={isAssistant}
          />
        )}
        {citations.length > 0 && <CitationDisplay citations={citations} />}
      </div>
    );
  }

  // Render as terminal message with citations
  return (
    <div>
      {processedContentBlocks.map((block, index) => (
        <React.Fragment key={index}>
          {block.type === 'text' ? (
            <MessageMarkdown
              content={block.content as string}
              isAssistant={isAssistant}
            />
          ) : block.type === 'terminal' ? (
            <TerminalBlockComponent
              block={block.content}
              index={index}
              isClosed={closedBlocks.has(index)}
              isExpanded={expandedOutputs.has(index)}
              onToggleBlock={toggleBlock}
              onToggleExpanded={toggleExpanded}
              totalBlocks={processedContentBlocks.length}
              isLastMessage={isLastMessage}
            />
          ) : block.type === 'shell-wait' ? (
            <ShellWaitBlockComponent block={block.content} />
          ) : block.type === 'info-search-web' ? (
            <InfoSearchWebBlockComponent block={block.content} />
          ) : (
            <FileContentBlockComponent block={block.content} index={index} />
          )}
        </React.Fragment>
      ))}
      {citations.length > 0 && <CitationDisplay citations={citations} />}
    </div>
  );
};
