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
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
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
import { AdminTableSkeleton } from "@/components/admin/AdminPageShell";
import {
  AdminPagination,
  ADMIN_PAGE_SIZE_OPTIONS,
} from "@/components/admin/AdminPagination";
import {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
} from "@/components/admin/AdminFormStyles";
import {
  Button,
  Checkbox,
  Dialog,
  IconButton,
  TextField,
} from "@/components/admin/admin-ui";
import { useNodeDetails } from "@/contexts/NodeDetailsContext";

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    size: 44,
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.uuid} />,
  },
  {
    id: "select",
    size: 44,
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          size={"1"}
          checked={
            table.getIsAllRowsSelected() ||
            (table.getIsSomeRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          size={"1"}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: t("admin.nodeTable.name"),
    size: 220,
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />;
    },
    enableHiding: false,
  },
  {
    accessorKey: "ipv4",
    header: t("admin.nodeTable.ipAddress"),
    size: 300,
    cell: ({ row }) => {
      const ipv4 = row.original.ipv4;
      const ipv6 = row.original.ipv6;
      return (
        <div className="flex min-w-[220px] max-w-[360px] flex-col gap-1">
          {ipv4 && (
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate font-mono text-xs">{ipv4}</span>
              <IconButton
                variant="ghost"
                className="size-5 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(ipv4);
                  toast.success(t("copy_success"));
                }}
              >
                <Copy size={16} />
              </IconButton>
            </div>
          )}
          {ipv6 && (
            <div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate font-mono text-xs">{ipv6}</span>
              <IconButton
                variant="ghost"
                className="size-5 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(ipv6);
                  toast.success(t("copy_success"));
                }}
              >
                <Copy size={16} />
              </IconButton>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "version",
    header: t("admin.nodeTable.clientVersion"),
    size: 128,
    cell: ({ row }) => (
      <div className="max-w-32 truncate text-xs text-muted-foreground">
        {row.getValue("version") || "-"}
      </div>
    ),
  },
  {
    id: "actions",
    size: 260,
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
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: ADMIN_PAGE_SIZE_OPTIONS[1],
  });
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );
  const isMobile = useIsMobile();
  const [newNodeName, setNewNodeName] = React.useState("");
  const [isAddingNode, setIsAddingNode] = React.useState(false);

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
      pagination,
    },
    getRowId: (row) => row.uuid.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });
  const pageRows = table.getRowModel().rows;
  const pageDataIds = React.useMemo<UniqueIdentifier[]>(
    () => pageRows.map((row) => row.original.uuid),
    [pageRows],
  );
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
      <div
        className={`
          mb-6 min-w-0
          ${!isMobile ? "p-4" : ""}
        `}
      >
        <div className="mb-4 flex items-center justify-between">
          <TextField.Root
            placeholder={t("admin.nodeTable.searchByName")}
            disabled
            className="max-w-2xs"
          />
          <Button disabled>
            <PlusIcon className="lg:mr-1" />
            <span className="hidden lg:inline">
              {t("admin.nodeTable.addNode")}
            </span>
          </Button>
        </div>
        <AdminTableSkeleton columns={columns.length} rows={6} />
      </div>
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
      <div className="flex items-center justify-between mb-4">
        <TextField.Root
          placeholder={t("admin.nodeTable.searchByName")}
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-2xs"
        />
        <Dialog.Root>
          <Dialog.Trigger>
            <Button>
              <PlusIcon className="lg:mr-1" />
              <span className="hidden lg:inline">
                {t("admin.nodeTable.addNode")}
              </span>
            </Button>
          </Dialog.Trigger>
          <Dialog.Content className={ADMIN_FORM_DIALOG_CLASS} maxWidth={520}>
            <Dialog.Title>{t("admin.nodeTable.addNode")}</Dialog.Title>
            <div className={`${ADMIN_FORM_SCROLL_CLASS} mt-1 space-y-4`}>
              <div className={ADMIN_FORM_FIELD_CLASS}>
                <label
                  data-slot="label"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  {t("admin.nodeTable.nameOptional")}
                </label>
                <TextField.Root
                  className="w-full"
                  placeholder={t("admin.nodeTable.namePlaceholder")}
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200/70 pt-4 dark:border-slate-800/70">
              <Button onClick={handleAddNode} disabled={isAddingNode}>
                {isAddingNode ? (
                  <span className="flex items-center gap-1">
                    <LoadingIcon className="animate-spin size-4" />
                    {t("admin.nodeTable.submitting")}
                  </span>
                ) : (
                  t("admin.nodeTable.submit")
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
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
              <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]">
              <Table className="min-w-[860px] table-fixed">
                <TableHeader className="bg-muted">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            style={{ width: header.getSize() }}
                            className="text-xs font-semibold text-muted-foreground"
                          >
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
                      items={pageDataIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {pageRows.map((row) => (
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
              </div>
            </DndContext>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-muted-foreground flex-1 text-sm">
                {t("admin.nodeTable.selectionSummary", {
                  selected: table.getFilteredSelectedRowModel().rows.length,
                  total: table.getFilteredRowModel().rows.length,
                  defaultValue: "{{selected}} / {{total}} selected",
                })}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="soft">
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
            <AdminPagination
              page={table.getState().pagination.pageIndex + 1}
              totalPages={table.getPageCount()}
              total={table.getFilteredRowModel().rows.length}
              pageSize={table.getState().pagination.pageSize}
              visibleStart={
                table.getFilteredRowModel().rows.length === 0
                  ? 0
                  : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1
              }
              visibleEnd={
                table.getFilteredRowModel().rows.length === 0
                  ? 0
                  : Math.min(
                      (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length,
                    )
              }
              onPageChange={(page) => table.setPageIndex(page - 1)}
              onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
                itemLabel={t("admin.pagination.nodes", { defaultValue: "设备" })}
            />
          </div>
        </div>
      </DataTableRefreshContext.Provider>
    </div>
  );
}
