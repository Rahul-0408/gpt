import { PentestGPTContext } from '@/context/context';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { type FC, useContext, useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { WithTooltip } from '../ui/with-tooltip';

export const ChatRetrievalSettings: FC = () => {
  const { sourceCount, setSourceCount } = useContext(PentestGPTContext);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <WithTooltip
          delayDuration={0}
          side="top"
          display={<div>Adjust retrieval settings.</div>}
          trigger={
            <IconAdjustmentsHorizontal
              className="cursor-pointer pt-[4px] hover:opacity-50"
              size={24}
            />
          }
        />
      </DialogTrigger>

      <DialogContent>
        <DialogTitle className="sr-only">Retrieval Settings</DialogTitle>

        <div className="space-y-3">
          <Label className="flex items-center space-x-1">
            <div>Source Count:</div>

            <div>{sourceCount}</div>
          </Label>

          <Slider
            value={[sourceCount]}
            onValueChange={(values) => {
              setSourceCount(values[0]);
            }}
            min={1}
            max={10}
            step={1}
          />
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => setIsOpen(false)}>
            Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
