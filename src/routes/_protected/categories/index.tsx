import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Briefcase,
	Car,
	ChevronDown,
	Circle,
	Fuel,
	GraduationCap,
	Heart,
	Home,
	Landmark,
	type LucideIcon,
	Receipt,
	ShoppingCart,
	Sparkles,
	Tag,
	TrendingUp,
	Tv,
	Utensils,
	Wallet,
} from "lucide-react";
import type { DragEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { ColorPicker } from "#/components/ui/color-picker";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	type Category,
	type CategoryGroup,
	createCategoriesDataAccess,
} from "#/features/categories/data-access";
import useCurrentUser from "#/hooks/use-current-user";

const TRANSACTION_TYPE_OPTIONS = [
	{ value: "expense", label: "Expense" },
	{ value: "income", label: "Income" },
	{ value: "transfer", label: "Transfer" },
];

const GROUP_ICON_OPTIONS = [
	{ value: "folder", label: "Folder" },
	{ value: "home", label: "Home" },
	{ value: "receipt", label: "Receipt" },
	{ value: "car", label: "Car" },
	{ value: "heart", label: "Health" },
	{ value: "briefcase", label: "Work" },
	{ value: "sparkles", label: "Lifestyle" },
	{ value: "landmark", label: "Bills" },
];

const CATEGORY_ICON_OPTIONS = [
	{ value: "tag", label: "Tag" },
	{ value: "shopping-cart", label: "Shopping" },
	{ value: "utensils", label: "Food" },
	{ value: "fuel", label: "Fuel" },
	{ value: "tv", label: "Entertainment" },
	{ value: "graduation-cap", label: "Education" },
	{ value: "wallet", label: "Cash" },
	{ value: "trending-up", label: "Investment" },
];

const ICON_COMPONENTS: Record<string, LucideIcon> = {
	folder: Circle,
	home: Home,
	receipt: Receipt,
	car: Car,
	heart: Heart,
	briefcase: Briefcase,
	sparkles: Sparkles,
	landmark: Landmark,
	tag: Tag,
	"shopping-cart": ShoppingCart,
	utensils: Utensils,
	fuel: Fuel,
	tv: Tv,
	"graduation-cap": GraduationCap,
	wallet: Wallet,
	"trending-up": TrendingUp,
};

function getIconComponent(iconName: string): LucideIcon {
	return ICON_COMPONENTS[iconName] ?? Circle;
}

function IconGlyph({ iconName }: { iconName: string }) {
	const IconComponent = getIconComponent(iconName);
	return <IconComponent className="size-4" />;
}

function IconSelect({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}) {
	const selected = options.find((option) => option.value === value);
	const SelectedIcon = getIconComponent(selected?.value ?? "");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="h-9 w-full justify-between rounded-none px-3 text-sm font-normal"
					>
						<span className="flex items-center gap-2">
							<SelectedIcon className="size-4" />
							<span>{selected?.label ?? "Select icon"}</span>
						</span>
						<ChevronDown className="size-4 text-muted-foreground" />
					</Button>
				}
			/>
			<DropdownMenuContent className="w-56 rounded-none p-1.5" align="start">
				<DropdownMenuRadioGroup
					value={value}
					onValueChange={(nextValue) => onChange(nextValue)}
				>
					{options.map((option) => {
						const OptionIcon = getIconComponent(option.value);

						return (
							<DropdownMenuRadioItem
								key={option.value}
								value={option.value}
								className="normal-case tracking-normal text-sm"
							>
								<OptionIcon className="size-4" />
								<span>{option.label}</span>
							</DropdownMenuRadioItem>
						);
					})}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const Route = createFileRoute("/_protected/categories/")({
	component: CategoriesPage,
});

function CategoriesPage() {
	const currentUser = useCurrentUser();
	const queryClient = useQueryClient();
	const categoriesApi = useMemo(
		() => createCategoriesDataAccess(currentUser),
		[currentUser],
	);
	const [showArchived, setShowArchived] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [groupName, setGroupName] = useState("");
	const [groupType, setGroupType] = useState("expense");
	const [groupIcon, setGroupIcon] = useState("folder");
	const [groupColor, setGroupColor] = useState("#334155");

	const [categoryName, setCategoryName] = useState("");
	const [categoryTransactionType, setCategoryTransactionType] =
		useState("expense");
	const [categoryIcon, setCategoryIcon] = useState("tag");
	const [categoryColor, setCategoryColor] = useState("#334155");
	const [selectedGroupId, setSelectedGroupId] = useState("");

	const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
	const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
		null,
	);

	const categoryGroupsQuery = useQuery({
		queryKey: ["category-groups", currentUser?.id, showArchived],
		queryFn: () => categoriesApi.fetchCategoryGroups(showArchived),
		enabled: Boolean(currentUser?.id),
	});

	const categoriesQuery = useQuery({
		queryKey: ["categories", currentUser?.id, showArchived],
		queryFn: () => categoriesApi.fetchCategories(showArchived),
		enabled: Boolean(currentUser?.id),
	});

	const groups = useMemo(
		() =>
			[...(categoryGroupsQuery.data?.categoryGroups ?? [])].sort(
				(a, b) => a.sortOrder - b.sortOrder,
			),
		[categoryGroupsQuery.data?.categoryGroups],
	);
	const categories = categoriesQuery.data?.categories ?? [];

	useEffect(() => {
		if (!groups.length) {
			setSelectedGroupId("");
			return;
		}

		if (
			!selectedGroupId ||
			!groups.some((group) => group.id === selectedGroupId)
		) {
			setSelectedGroupId(groups[0].id);
		}
	}, [groups, selectedGroupId]);

	const categoriesByGroupId = useMemo(() => {
		return categories.reduce<Record<string, Category[]>>((acc, category) => {
			const list = acc[category.groupId] ?? [];
			list.push(category);
			acc[category.groupId] = list;
			return acc;
		}, {});
	}, [categories]);

	const createGroupMutation = useMutation({
		mutationFn: (input: {
			name: string;
			type: string;
			icon: string;
			color: string;
		}) => categoriesApi.createCategoryGroup(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["category-groups", currentUser?.id],
			});
			setGroupName("");
		},
	});

	const createCategoryMutation = useMutation({
		mutationFn: (input: {
			groupId: string;
			name: string;
			transactionType: string;
			icon: string;
			color: string;
		}) => categoriesApi.createCategory(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["categories", currentUser?.id],
			});
			setCategoryName("");
		},
	});

	const updateGroupMutation = useMutation({
		mutationFn: (payload: {
			groupId: string;
			input: {
				name?: string;
				type?: string;
				icon?: string;
				color?: string;
				sortOrder?: number;
				isArchived?: boolean;
			};
		}) => categoriesApi.updateCategoryGroup(payload.groupId, payload.input),
	});

	const updateCategoryMutation = useMutation({
		mutationFn: (payload: {
			categoryId: string;
			input: {
				groupId?: string;
				name?: string;
				icon?: string;
				color?: string;
				transactionType?: string;
				sortOrder?: number;
				isArchived?: boolean;
			};
		}) => categoriesApi.updateCategory(payload.categoryId, payload.input),
	});

	const deleteGroupMutation = useMutation({
		mutationFn: (groupId: string) => categoriesApi.deleteCategoryGroup(groupId),
	});

	const deleteCategoryMutation = useMutation({
		mutationFn: (categoryId: string) =>
			categoriesApi.deleteCategory(categoryId),
	});

	async function refreshCategoriesState() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["category-groups", currentUser?.id],
			}),
			queryClient.invalidateQueries({
				queryKey: ["categories", currentUser?.id],
			}),
		]);
	}

	async function onCreateGroup(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		try {
			await createGroupMutation.mutateAsync({
				name: groupName,
				type: groupType,
				icon: groupIcon,
				color: groupColor,
			});
		} catch {
			setError("Unable to create category group");
		}
	}

	async function onCreateCategory(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		if (!selectedGroupId) {
			setError("Create a group first");
			return;
		}

		try {
			await createCategoryMutation.mutateAsync({
				groupId: selectedGroupId,
				name: categoryName,
				transactionType: categoryTransactionType,
				icon: categoryIcon,
				color: categoryColor,
			});
		} catch {
			setError("Unable to create category");
		}
	}

	async function reorderGroups(sourceId: string, targetId: string) {
		if (sourceId === targetId) {
			return;
		}

		const sourceIndex = groups.findIndex((group) => group.id === sourceId);
		const targetIndex = groups.findIndex((group) => group.id === targetId);

		if (sourceIndex < 0 || targetIndex < 0) {
			return;
		}

		const reordered = [...groups];
		const [moved] = reordered.splice(sourceIndex, 1);
		reordered.splice(targetIndex, 0, moved);

		const updates = reordered
			.map((group, index) => ({ group, index }))
			.filter(({ group, index }) => group.sortOrder !== index);

		if (!updates.length) {
			return;
		}

		await Promise.all(
			updates.map(({ group, index }) =>
				updateGroupMutation.mutateAsync({
					groupId: group.id,
					input: { sortOrder: index },
				}),
			),
		);
		await refreshCategoriesState();
	}

	async function reorderCategories(
		groupId: string,
		sourceId: string,
		targetId: string,
	) {
		if (sourceId === targetId) {
			return;
		}

		const groupCategories = [...(categoriesByGroupId[groupId] ?? [])].sort(
			(a, b) => a.sortOrder - b.sortOrder,
		);
		const sourceIndex = groupCategories.findIndex(
			(category) => category.id === sourceId,
		);
		const targetIndex = groupCategories.findIndex(
			(category) => category.id === targetId,
		);

		if (sourceIndex < 0 || targetIndex < 0) {
			return;
		}

		const reordered = [...groupCategories];
		const [moved] = reordered.splice(sourceIndex, 1);
		reordered.splice(targetIndex, 0, moved);

		const updates = reordered
			.map((category, index) => ({ category, index }))
			.filter(({ category, index }) => category.sortOrder !== index);

		if (!updates.length) {
			return;
		}

		await Promise.all(
			updates.map(({ category, index }) =>
				updateCategoryMutation.mutateAsync({
					categoryId: category.id,
					input: { sortOrder: index },
				}),
			),
		);
		await refreshCategoriesState();
	}

	async function onGroupDrop(
		event: DragEvent<HTMLDivElement>,
		groupId: string,
	) {
		event.preventDefault();

		if (!draggedGroupId) {
			return;
		}

		setError(null);
		try {
			await reorderGroups(draggedGroupId, groupId);
		} catch {
			setError("Unable to reorder category groups");
		} finally {
			setDraggedGroupId(null);
		}
	}

	async function onCategoryDrop(
		event: DragEvent<HTMLDivElement>,
		groupId: string,
		categoryId: string,
	) {
		event.preventDefault();

		if (!draggedCategoryId) {
			return;
		}

		setError(null);
		try {
			await reorderCategories(groupId, draggedCategoryId, categoryId);
		} catch {
			setError("Unable to reorder categories");
		} finally {
			setDraggedCategoryId(null);
		}
	}

	async function onToggleGroupArchive(group: CategoryGroup) {
		setError(null);

		try {
			await updateGroupMutation.mutateAsync({
				groupId: group.id,
				input: { isArchived: !group.isArchived },
			});
			await refreshCategoriesState();
		} catch {
			setError("Unable to update category group");
		}
	}

	async function onToggleCategoryArchive(category: Category) {
		setError(null);

		try {
			await updateCategoryMutation.mutateAsync({
				categoryId: category.id,
				input: { isArchived: !category.isArchived },
			});
			await refreshCategoriesState();
		} catch {
			setError("Unable to update category");
		}
	}

	async function onDeleteGroup(groupId: string) {
		setError(null);

		try {
			await deleteGroupMutation.mutateAsync(groupId);
			await refreshCategoriesState();
		} catch {
			setError("Unable to delete category group");
		}
	}

	async function onDeleteCategory(categoryId: string) {
		setError(null);

		try {
			await deleteCategoryMutation.mutateAsync(categoryId);
			await refreshCategoriesState();
		} catch {
			setError("Unable to delete category");
		}
	}

	return (
		<div className="space-y-6 p-6">
			<Card>
				<CardHeader>
					<CardTitle>Categories Setup</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Build your own group and category system. Drag and drop to reorder.
					</p>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={() => setShowArchived((value) => !value)}
						>
							{showArchived ? "Hide Archived" : "Show Archived"}
						</Button>
						{categoryGroupsQuery.isLoading || categoriesQuery.isLoading ? (
							<p className="text-sm text-muted-foreground">
								Loading category data...
							</p>
						) : null}
					</div>

					{error ? <p className="text-sm text-destructive">{error}</p> : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Create Category Group</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={onCreateGroup} className="grid gap-3 md:grid-cols-5">
						<div className="space-y-2">
							<Label htmlFor="group-name">Name</Label>
							<Input
								id="group-name"
								value={groupName}
								onChange={(event) => setGroupName(event.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="group-type">Type</Label>
							<Select
								value={groupType}
								onValueChange={(v) => setGroupType(v ?? "")}
							>
								<SelectTrigger id="group-type">
									<span
										data-slot="select-value"
										className="flex flex-1 text-left text-sm"
									>
										{TRANSACTION_TYPE_OPTIONS.find((o) => o.value === groupType)
											?.label ?? groupType}
									</span>
								</SelectTrigger>
								<SelectContent>
									{TRANSACTION_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="group-icon">Icon</Label>
							<IconSelect
								value={groupIcon}
								onChange={setGroupIcon}
								options={GROUP_ICON_OPTIONS}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="group-color">Color</Label>
							<ColorPicker
								id="group-color"
								value={groupColor}
								onChange={setGroupColor}
								className="[&_input]:rounded-none"
							/>
						</div>
						<div className="flex items-end">
							<Button
								type="submit"
								className="w-full"
								disabled={createGroupMutation.isPending}
							>
								Add Group
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Create Category</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={onCreateCategory}
						className="grid gap-3 md:grid-cols-6"
					>
						<div className="space-y-2 md:col-span-2">
							<Label htmlFor="category-group">Group</Label>
							<Select
								value={selectedGroupId}
								onValueChange={(v) => setSelectedGroupId(v ?? "")}
							>
								<SelectTrigger id="category-group">
									{selectedGroupId ? (
										<span
											data-slot="select-value"
											className="flex flex-1 text-left text-sm"
										>
											{groups.find((g) => g.id === selectedGroupId)?.name ??
												selectedGroupId}
										</span>
									) : (
										<SelectValue placeholder="Select group" />
									)}
								</SelectTrigger>
								<SelectContent>
									{groups.map((group) => (
										<SelectItem key={group.id} value={group.id}>
											{group.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="category-name">Name</Label>
							<Input
								id="category-name"
								value={categoryName}
								onChange={(event) => setCategoryName(event.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="category-transaction-type">
								Transaction Type
							</Label>
							<Select
								value={categoryTransactionType}
								onValueChange={(v) => setCategoryTransactionType(v ?? "")}
							>
								<SelectTrigger id="category-transaction-type">
									<span
										data-slot="select-value"
										className="flex flex-1 text-left text-sm"
									>
										{TRANSACTION_TYPE_OPTIONS.find(
											(o) => o.value === categoryTransactionType,
										)?.label ?? categoryTransactionType}
									</span>
								</SelectTrigger>
								<SelectContent>
									{TRANSACTION_TYPE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="category-icon">Icon</Label>
							<IconSelect
								value={categoryIcon}
								onChange={setCategoryIcon}
								options={CATEGORY_ICON_OPTIONS}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="category-color">Color</Label>
							<ColorPicker
								id="category-color"
								value={categoryColor}
								onChange={setCategoryColor}
								className="[&_input]:rounded-none"
							/>
						</div>
						<div className="md:col-span-6">
							<Button
								type="submit"
								disabled={
									createCategoryMutation.isPending || groups.length === 0
								}
							>
								Add Category
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Category Groups and Categories</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{groups.length === 0 ? (
						<p className="text-sm text-muted-foreground">No groups yet.</p>
					) : null}

					{groups.map((group) => (
						// biome-ignore lint/a11y/useSemanticElements: draggable group items inside a div container, not a ul
						<div
							key={group.id}
							role="listitem"
							className="space-y-3 border p-3"
							draggable
							onDragStart={() => setDraggedGroupId(group.id)}
							onDragOver={(event) => event.preventDefault()}
							onDrop={(event) => onGroupDrop(event, group.id)}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<p className="flex items-center gap-2 font-medium">
										<IconGlyph iconName={group.icon} />
										{group.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{group.type} • {group.color}
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										onClick={() => onToggleGroupArchive(group)}
									>
										{group.isArchived ? "Unarchive" : "Archive"}
									</Button>
									<Button
										variant="destructive"
										onClick={() => onDeleteGroup(group.id)}
									>
										Delete
									</Button>
								</div>
							</div>

							<div className="space-y-2 pl-3">
								{(categoriesByGroupId[group.id] ?? []).length === 0 ? (
									<p className="text-xs text-muted-foreground">
										No categories in this group.
									</p>
								) : null}

								{(categoriesByGroupId[group.id] ?? [])
									.slice()
									.sort((a, b) => a.sortOrder - b.sortOrder)
									.map((category) => (
										// biome-ignore lint/a11y/useSemanticElements: draggable category items inside a div container, not a ul
										<div
											key={category.id}
											role="listitem"
											className="flex flex-wrap items-center justify-between gap-2 border p-2"
											draggable
											onDragStart={() => setDraggedCategoryId(category.id)}
											onDragOver={(event) => event.preventDefault()}
											onDrop={(event) =>
												onCategoryDrop(event, group.id, category.id)
											}
										>
											<div>
												<p className="flex items-center gap-2 text-sm font-medium">
													<IconGlyph iconName={category.icon} />
													{category.name}
												</p>
												<p className="text-xs text-muted-foreground">
													{category.transactionType} • {category.color}
												</p>
											</div>
											<div className="flex gap-2">
												<Button
													variant="outline"
													onClick={() => onToggleCategoryArchive(category)}
												>
													{category.isArchived ? "Unarchive" : "Archive"}
												</Button>
												<Button
													variant="destructive"
													onClick={() => onDeleteCategory(category.id)}
												>
													Delete
												</Button>
											</div>
										</div>
									))}
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
