import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";

type ColorPickerProps = {
	id?: string;
	value: string;
	onChange: (color: string) => void;
	className?: string;
	disabled?: boolean;
};

const HEX_COLOR_REGEX = /^#([0-9A-F]{6})$/i;
const VIBRANT_PRESETS = [
	"#FF4D6D",
	"#FF7A00",
	"#FFD60A",
	"#38B000",
	"#00B4D8",
	"#3A86FF",
	"#8338EC",
	"#FF006E",
];

export function ColorPicker({
	id,
	value,
	onChange,
	className,
	disabled,
}: ColorPickerProps) {
	const [open, setOpen] = useState(false);
	const [draftColor, setDraftColor] = useState("#64748B");
	const normalized = HEX_COLOR_REGEX.test(value)
		? value.toUpperCase()
		: "#64748B";

	useEffect(() => {
		if (open) {
			setDraftColor(normalized);
		}
	}, [open, normalized]);

	const draftNormalized = HEX_COLOR_REGEX.test(draftColor)
		? draftColor.toUpperCase()
		: "#64748B";

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-center gap-2">
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger
						render={
							<Button
								type="button"
								variant="outline"
								className="border-input h-9 w-11 shrink-0 rounded-none p-0"
								disabled={disabled}
								style={{ backgroundColor: normalized }}
							/>
						}
					>
						<span className="sr-only">Open color picker</span>
					</DialogTrigger>
					<DialogContent className="rounded-none sm:max-w-sm">
						<DialogHeader>
							<DialogTitle>Choose color</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="[&_.react-colorful]:w-full [&_.react-colorful__saturation]:rounded-none [&_.react-colorful__hue]:h-3 [&_.react-colorful__hue]:rounded-none [&_.react-colorful__pointer]:h-4 [&_.react-colorful__pointer]:w-4 [&_.react-colorful__pointer]:rounded-none [&_.react-colorful__pointer]:border-2 [&_.react-colorful__pointer]:border-background">
								<HexColorPicker
									color={draftNormalized}
									onChange={(nextColor) =>
										setDraftColor(nextColor.toUpperCase())
									}
								/>
							</div>
							<Input
								value={draftNormalized}
								onChange={(event) =>
									setDraftColor(event.target.value.toUpperCase())
								}
								className="rounded-none font-mono"
								maxLength={7}
								disabled={disabled}
							/>
							<div className="grid grid-cols-8 gap-1">
								{VIBRANT_PRESETS.map((preset) => (
									<button
										key={preset}
										type="button"
										onClick={() => setDraftColor(preset)}
										className={cn(
											"h-7 w-full rounded-none border transition-opacity hover:opacity-85",
											draftNormalized === preset
												? "border-foreground"
												: "border-input",
										)}
										style={{ backgroundColor: preset }}
										aria-label={`Use preset ${preset}`}
									/>
								))}
							</div>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									className="rounded-none"
									onClick={() => setOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									className="rounded-none"
									onClick={() => {
										onChange(draftNormalized);
										setOpen(false);
									}}
								>
									Apply
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
				<Input
					id={id}
					value={normalized}
					onChange={(event) => onChange(event.target.value.toUpperCase())}
					className="rounded-none font-mono"
					maxLength={7}
					disabled={disabled}
				/>
			</div>
		</div>
	);
}
