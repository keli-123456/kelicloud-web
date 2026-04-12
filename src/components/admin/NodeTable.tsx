import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { z } from "zod";

import { TableCellViewer } from "./NodeTable/NodeDetailViewer";
import { DragHandle, DraggableRow } from "./NodeTable/NodeTableDndComponents";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, Columns2, Copy, PlusIcon } from "lucide-react";

import type { schema } from "./NodeTable/schema/node";
import { DataTableRefreshContext } from "./NodeTable/schema/DataTableRefreshContext";
import { t } from "i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActionsCell } from "./NodeTable/NodeFunction";
import { toast } from "sonner";
import { LoadingIcon } from "../Icones/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EditDialogShell } from "@/components/ui/modal-shell";
import {
  FormActions,
  FormField,
  FormShell,
} from "@/components/ui/form-shell";
import Loading from "../loading";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.uuid} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllRowsSelected() ||
            (table.getIsSomeRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label={t("admin.nodeTable.selectAll", {
            defaultValue: "Select all rows",
          })}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("admin.nodeTable.selectOne", {
            defaultValue: "Select this row",
          })}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: t("admin.nodeTable.name"),
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
  },
  {
    accessorKey: "ipv4",
    header: t("admin.nodeTable.ipAddress"),
    cell: ({ row }) => {
      const ipv4 = row.original.ipv4;
      const ipv6 = row.original.ipv6;
      return (
        <div className="flex flex-col gap-1 min-w-80">
          {ipv4 && (
            <div className="flex items-center gap-1">
              <span>{ipv4}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t("admin.nodeTable.copyIpv4", {
                  defaultValue: "Copy IPv4 address",
                })}
                onClick={() => {
                  void navigator.clipboard.writeText(ipv4);
                  toast.success(t("copy_success"));
                }}
              >
                <Copy size={16} />
              </Button>
            </div>
          )}
          {ipv6 && (
            <div className="flex items-center gap-1">
              <span>{ipv6}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t("admin.nodeTable.copyIpv6", {
                  defaultValue: "Copy IPv6 address",
                })}
                onClick={() => {
                  void navigator.clipboard.writeText(ipv6);
                  toast.success(t("copy_success"));
                }}
              >
                <Copy size={16} />
              </Button>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "version",
    header: t("admin.nodeTable.clientVersion"),
    cell: ({ row }) => <div className="w-32">{row.getValue("version")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];

export function DataTable() {
  const {
    nodeDetail,
    isLoading,
    error: providerError,
    refresh,
  } = useNodeDetails();
  const [data, setData] = React.useState<z.infer<typeof schema>[]>([]);

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );
  const isMobile = useIsMobile();
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ uuid }) => uuid) || [],
    [data]
  );
  const [newNodeName, setNewNodeName] = React.useState("");
  const [isAddingNode, setIsAddingNode] = React.useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setData([...nodeDetail].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0)));
  }, [nodeDetail]);

  async function handleAddNode() {
    setIsAddingNode(true);
    try {
      const response = await fetch("/api/admin/client/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newNodeName }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setNewNodeName("");
      await refresh({ silent: true });
      setAddNodeDialogOpen(false);
    } catch (error) {
      console.error("Failed to add node:", error);
      toast.error(t("admin.nodeTable.errorRefreshNodeList"));
    } finally {
      setIsAddingNode(false);
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    getRowId: (row) => row.uuid.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over) {
      if (active.id !== over.id) {
        setData((currentData) => {
          const oldIndex = currentData.findIndex(
            (item) => item.uuid === active.id
          );
          const newIndex = currentData.findIndex(
            (item) => item.uuid === over.id
          );
          if (oldIndex === -1 || newIndex === -1) return currentData;

          const newData = arrayMove(currentData, oldIndex, newIndex);

          // 重新生成 weight
          const updatedData = newData.map((item, index) => ({
            ...item,
            weight: index, // 从 0 开始重新设置 weight
          }));

          // 构造 { uuid: weight } 对象
          const orderObj = updatedData.reduce((acc, cur) => {
            acc[cur.uuid] = cur.weight!;
            return acc;
          }, {} as Record<string, number>);

          // 提交到后端
          fetch("/api/admin/client/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderObj),
          });
          console.log("提交的顺序:", JSON.stringify(orderObj));
          return updatedData;
        });
      }
    }
  }

  // 新增：刷新数据的方法
  const refreshTable = React.useCallback(() => {
    void refresh({ silent: true });
  }, [refresh]);

  if (isLoading) {
    return (
      <Loading />
    );
  }

  if (providerError) {
    return <div className="p-4 text-center text-red-500">{providerError}</div>;
  }

  return (
    <div
      className={`
        mb-6 min-w-0
        ${!isMobile ? "p-4" : ""}
      `}
    >
      <h2 className="text-2xl font-bold mb-4">
        {t("admin.nodeTable.nodeList")}
      </h2>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder={t("admin.nodeTable.searchByName")}
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-2xs"
        />
        <Button onClick={() => setAddNodeDialogOpen(true)}>
          <PlusIcon className="lg:mr-1" />
          <span className="hidden lg:inline">
            {t("admin.nodeTable.addNode")}
          </span>
        </Button>
      </div>
      <EditDialogShell
        open={addNodeDialogOpen}
        onOpenChange={setAddNodeDialogOpen}
        size="sm"
        title={t("admin.nodeTable.addNode")}
        description={t(
          "admin.nodeTable.addNodeDescription",
          "Create an empty node entry and complete details later.",
        )}
        footer={(
          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddNodeDialogOpen(false)}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button onClick={() => void handleAddNode()} disabled={isAddingNode}>
              {isAddingNode ? (
                <span className="flex items-center gap-1">
                  <LoadingIcon className="animate-spin size-4" />
                  {t("admin.nodeTable.submitting")}
                </span>
              ) : (
                t("admin.nodeTable.submit")
              )}
            </Button>
          </FormActions>
        )}
      >
        <FormShell>
          <FormField
            label={t("admin.nodeTable.nameOptional")}
            htmlFor="admin-node-add-name"
          >
            <Input
              id="admin-node-add-name"
              placeholder={t("admin.nodeTable.namePlaceholder")}
              value={newNodeName}
              onChange={(event) => setNewNodeName(event.target.value)}
            />
          </FormField>
        </FormShell>
      </EditDialogShell>
      <DataTableRefreshContext.Provider value={refreshTable}>
        <div className="flex min-w-0 w-full flex-col justify-start gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"></div>
          </div>
          <div className="relative flex min-w-0 flex-col gap-4">
            <DndContext
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
              sensors={sensors}
              id={sortableId}
            >
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader className="bg-muted">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead key={header.id} colSpan={header.colSpan}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody className="**:data-[slot=table-cell]:first:w-8">
                    {table.getRowModel().rows?.length ? (
                      <SortableContext
                        items={dataIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {table.getRowModel().rows.map((row) => (
                          <DraggableRow key={row.id} row={row} />
                        ))}
                      </SortableContext>
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          {data.length === 0 && !isLoading
                            ? t("admin.nodeTable.noData")
                            : t("admin.nodeTable.noResults")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </DndContext>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground flex-1 text-sm">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    <Columns2 />
                    <span className="hidden lg:inline">
                      {t("admin.nodeTable.customColumns")}
                    </span>
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== "undefined" &&
                        column.getCanHide()
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </DataTableRefreshContext.Provider>
    </div>
  );
}
