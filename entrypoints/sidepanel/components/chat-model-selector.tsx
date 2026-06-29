import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useConfig } from "@/contexts/config";

type Props = {};

export const ChatModelSelector = (props: Props) => {
  const { model } = useConfig();

  return (
    <ModelSelector
      open={model.isModalOpen}
      onOpenChange={model.isModalOpen ? model.onModalClose : model.onModalOpen}
    >
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Models">
            {model.list.map((m) => (
              <ModelSelectorItem
                key={m.id}
                value={m.id}
                onSelect={() => {
                  model.update(m.id);
                  model.onModalClose();
                }}
              >
                <ModelSelectorLogo provider={m.provider} />
                <ModelSelectorName>{m.name}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};

export const ChatModelSelectorTrigger = (
  props: ButtonProps & { onlyIcon?: boolean },
) => {
  const { onlyIcon = false, ...others } = props;
  const { model } = useConfig();

  return (
    <Button
      {...others}
      onClick={model.isModalOpen ? model.onModalClose : model.onModalOpen}
    >
      <ModelSelectorLogo
        provider={model.value?.provider ?? "openrouter"}
        className={onlyIcon ? "size-5" : ""}
      />
      {!onlyIcon && (
        <span className="truncate shrink">
          {model.value?.name ?? "Select a model"}
        </span>
      )}
    </Button>
  );
};
