import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Briefcase, Pencil, Plus, Trash2, Users, Wallet, FileSignature } from "lucide-react";

interface Employee {
  id: string;
  employee_code: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  national_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department: string | null;
  employment_type: string;
  status: string;
  hire_date: string | null;
  end_date: string | null;
  salary: number | null;
  currency: string;
  pay_frequency: string;
  bank_account: string | null;
  emergency_contact: string | null;
  notes: string | null;
}

interface Contract {
  id: string;
  employee_id: string;
  title: string | null;
  contract_type: string;
  start_date: string | null;
  end_date: string | null;
  salary: number | null;
  hours_per_week: number | null;
  status: string;
  document_url: string | null;
  notes: string | null;
}

const empEmpty = {
  employee_code: "",
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  national_id: "",
  email: "",
  phone: "",
  address: "",
  job_title: "",
  department: "",
  employment_type: "full_time",
  status: "active",
  hire_date: "",
  end_date: "",
  salary: "",
  currency: "ALL",
  pay_frequency: "monthly",
  bank_account: "",
  emergency_contact: "",
  notes: "",
};

const contractEmpty = {
  employee_id: "",
  title: "",
  contract_type: "permanent",
  start_date: "",
  end_date: "",
  salary: "",
  hours_per_week: "",
  status: "active",
  document_url: "",
  notes: "",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  on_leave: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  suspended: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  terminated: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  expired: "bg-muted text-muted-foreground",
  draft: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

const nullify = (v: string) => (v.trim() === "" ? null : v.trim());
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const AdminEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const [empEditId, setEmpEditId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({ ...empEmpty });
  const [contractOpen, setContractOpen] = useState(false);
  const [contractEditId, setContractEditId] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState({ ...contractEmpty });

  const loadAll = async () => {
    setLoading(true);
    const [{ data: emps, error: e1 }, { data: cons, error: e2 }] = await Promise.all([
      supabase.from("employees").select("*").order("last_name", { ascending: true }),
      supabase.from("employee_contracts").select("*").order("start_date", { ascending: false }),
    ]);
    if (e1 || e2) toast.error("Failed to load employee data");
    setEmployees((emps as Employee[]) || []);
    setContracts((cons as Contract[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const empMap = useMemo(() => {
    const m: Record<string, Employee> = {};
    employees.forEach((e) => (m[e.id] = e));
    return m;
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.first_name, e.last_name, e.job_title, e.department, e.email, e.employee_code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [employees, search]);

  const totalMonthly = useMemo(
    () =>
      employees
        .filter((e) => e.status === "active")
        .reduce((sum, e) => {
          const s = e.salary || 0;
          const monthly = e.pay_frequency === "yearly" ? s / 12 : e.pay_frequency === "weekly" ? s * 4.33 : s;
          return sum + monthly;
        }, 0),
    [employees]
  );

  const openEmp = (e?: Employee) => {
    if (e) {
      setEmpEditId(e.id);
      setEmpForm({
        employee_code: e.employee_code || "",
        first_name: e.first_name,
        last_name: e.last_name,
        date_of_birth: e.date_of_birth || "",
        gender: e.gender || "",
        national_id: e.national_id || "",
        email: e.email || "",
        phone: e.phone || "",
        address: e.address || "",
        job_title: e.job_title || "",
        department: e.department || "",
        employment_type: e.employment_type,
        status: e.status,
        hire_date: e.hire_date || "",
        end_date: e.end_date || "",
        salary: e.salary != null ? String(e.salary) : "",
        currency: e.currency,
        pay_frequency: e.pay_frequency,
        bank_account: e.bank_account || "",
        emergency_contact: e.emergency_contact || "",
        notes: e.notes || "",
      });
    } else {
      setEmpEditId(null);
      setEmpForm({ ...empEmpty });
    }
    setEmpOpen(true);
  };

  const saveEmp = async () => {
    if (!empForm.first_name.trim() || !empForm.last_name.trim()) {
      toast.error("Name and surname are required");
      return;
    }
    const payload = {
      employee_code: nullify(empForm.employee_code),
      first_name: empForm.first_name.trim(),
      last_name: empForm.last_name.trim(),
      date_of_birth: nullify(empForm.date_of_birth),
      gender: nullify(empForm.gender),
      national_id: nullify(empForm.national_id),
      email: nullify(empForm.email),
      phone: nullify(empForm.phone),
      address: nullify(empForm.address),
      job_title: nullify(empForm.job_title),
      department: nullify(empForm.department),
      employment_type: empForm.employment_type,
      status: empForm.status,
      hire_date: nullify(empForm.hire_date),
      end_date: nullify(empForm.end_date),
      salary: numOrNull(empForm.salary),
      currency: empForm.currency,
      pay_frequency: empForm.pay_frequency,
      bank_account: nullify(empForm.bank_account),
      emergency_contact: nullify(empForm.emergency_contact),
      notes: nullify(empForm.notes),
    };
    const { error } = empEditId
      ? await supabase.from("employees").update(payload).eq("id", empEditId)
      : await supabase.from("employees").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(empEditId ? "Employee updated" : "Employee added");
    setEmpOpen(false);
    loadAll();
  };

  const deleteEmp = async (id: string) => {
    if (!confirm("Delete this employee and all their contracts?")) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Employee deleted");
    loadAll();
  };

  const openContract = (c?: Contract, employeeId?: string) => {
    if (c) {
      setContractEditId(c.id);
      setContractForm({
        employee_id: c.employee_id,
        title: c.title || "",
        contract_type: c.contract_type,
        start_date: c.start_date || "",
        end_date: c.end_date || "",
        salary: c.salary != null ? String(c.salary) : "",
        hours_per_week: c.hours_per_week != null ? String(c.hours_per_week) : "",
        status: c.status,
        document_url: c.document_url || "",
        notes: c.notes || "",
      });
    } else {
      setContractEditId(null);
      setContractForm({ ...contractEmpty, employee_id: employeeId || "" });
    }
    setContractOpen(true);
  };

  const saveContract = async () => {
    if (!contractForm.employee_id) {
      toast.error("Select an employee");
      return;
    }
    const payload = {
      employee_id: contractForm.employee_id,
      title: nullify(contractForm.title),
      contract_type: contractForm.contract_type,
      start_date: nullify(contractForm.start_date),
      end_date: nullify(contractForm.end_date),
      salary: numOrNull(contractForm.salary),
      hours_per_week: numOrNull(contractForm.hours_per_week),
      status: contractForm.status,
      document_url: nullify(contractForm.document_url),
      notes: nullify(contractForm.notes),
    };
    const { error } = contractEditId
      ? await supabase.from("employee_contracts").update(payload).eq("id", contractEditId)
      : await supabase.from("employee_contracts").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(contractEditId ? "Contract updated" : "Contract added");
    setContractOpen(false);
    loadAll();
  };

  const deleteContract = async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    const { error } = await supabase.from("employee_contracts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contract deleted");
    loadAll();
  };

  const money = (v: number | null, cur = "ALL") =>
    v == null ? "—" : `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${cur}`;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Employee Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff records, jobs, salaries and contracts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openContract()}>
            <FileSignature className="mr-2 h-4 w-4" /> New Contract
          </Button>
          <Button onClick={() => openEmp()}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <Users className="mb-2 h-5 w-5 text-accent" />
            <p className="font-display text-2xl font-bold">{employees.length}</p>
            <p className="text-sm text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Briefcase className="mb-2 h-5 w-5 text-accent" />
            <p className="font-display text-2xl font-bold">
              {employees.filter((e) => e.status === "active").length}
            </p>
            <p className="text-sm text-muted-foreground">Active staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <Wallet className="mb-2 h-5 w-5 text-accent" />
            <p className="font-display text-2xl font-bold">
              {totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-muted-foreground">Est. monthly payroll</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="mt-8">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <Input
            placeholder="Search by name, job, department or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {loading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No employees yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">DOB</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {e.first_name} {e.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.employee_code || e.email || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.date_of_birth || "—"}</td>
                      <td className="px-4 py-3">{e.job_title || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.department || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {e.employment_type.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        {money(e.salary, e.currency)}
                        <span className="block text-xs text-muted-foreground">{e.pay_frequency}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[e.status] || ""} variant="secondary">
                          {e.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openContract(undefined, e.id)}>
                            <FileSignature className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEmp(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteEmp(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Contract</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Salary</th>
                    <th className="px-4 py-3">Hours/wk</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => {
                    const emp = empMap[c.employee_id];
                    return (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">
                          {emp ? `${emp.first_name} ${emp.last_name}` : "—"}
                        </td>
                        <td className="px-4 py-3">{c.title || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.contract_type.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.start_date || "—"} → {c.end_date || "open"}
                        </td>
                        <td className="px-4 py-3">{money(c.salary, emp?.currency || "ALL")}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.hours_per_week ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[c.status] || ""} variant="secondary">
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openContract(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteContract(c.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Employee dialog */}
      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{empEditId ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input value={empForm.first_name} onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Surname *</Label>
              <Input value={empForm.last_name} onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })} />
            </div>
            <div>
              <Label>Employee code</Label>
              <Input value={empForm.employee_code} onChange={(e) => setEmpForm({ ...empForm, employee_code: e.target.value })} />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input type="date" value={empForm.date_of_birth} onChange={(e) => setEmpForm({ ...empForm, date_of_birth: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={empForm.gender || "unspecified"} onValueChange={(v) => setEmpForm({ ...empForm, gender: v === "unspecified" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Unspecified</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>National ID</Label>
              <Input value={empForm.national_id} onChange={(e) => setEmpForm({ ...empForm, national_id: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={empForm.address} onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })} />
            </div>
            <div>
              <Label>Job title</Label>
              <Input value={empForm.job_title} onChange={(e) => setEmpForm({ ...empForm, job_title: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={empForm.department} onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })} />
            </div>
            <div>
              <Label>Employment type</Label>
              <Select value={empForm.employment_type} onValueChange={(v) => setEmpForm({ ...empForm, employment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={empForm.status} onValueChange={(v) => setEmpForm({ ...empForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hire date</Label>
              <Input type="date" value={empForm.hire_date} onChange={(e) => setEmpForm({ ...empForm, hire_date: e.target.value })} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={empForm.end_date} onChange={(e) => setEmpForm({ ...empForm, end_date: e.target.value })} />
            </div>
            <div>
              <Label>Salary</Label>
              <Input type="number" step="0.01" value={empForm.salary} onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={empForm.currency} onValueChange={(v) => setEmpForm({ ...empForm, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pay frequency</Label>
              <Select value={empForm.pay_frequency} onValueChange={(v) => setEmpForm({ ...empForm, pay_frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bank account / IBAN</Label>
              <Input value={empForm.bank_account} onChange={(e) => setEmpForm({ ...empForm, bank_account: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Emergency contact</Label>
              <Input value={empForm.emergency_contact} onChange={(e) => setEmpForm({ ...empForm, emergency_contact: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={empForm.notes} onChange={(e) => setEmpForm({ ...empForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpOpen(false)}>Cancel</Button>
            <Button onClick={saveEmp}>{empEditId ? "Save changes" : "Add employee"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract dialog */}
      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contractEditId ? "Edit Contract" : "New Contract"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Employee *</Label>
              <Select value={contractForm.employee_id} onValueChange={(v) => setContractForm({ ...contractForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Contract title</Label>
              <Input value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Contract type</Label>
              <Select value={contractForm.contract_type} onValueChange={(v) => setContractForm({ ...contractForm, contract_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="fixed_term">Fixed term</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={contractForm.status} onValueChange={(v) => setContractForm({ ...contractForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} />
            </div>
            <div>
              <Label>Salary</Label>
              <Input type="number" step="0.01" value={contractForm.salary} onChange={(e) => setContractForm({ ...contractForm, salary: e.target.value })} />
            </div>
            <div>
              <Label>Hours per week</Label>
              <Input type="number" step="0.5" value={contractForm.hours_per_week} onChange={(e) => setContractForm({ ...contractForm, hours_per_week: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Document link</Label>
              <Input value={contractForm.document_url} onChange={(e) => setContractForm({ ...contractForm, document_url: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractOpen(false)}>Cancel</Button>
            <Button onClick={saveContract}>{contractEditId ? "Save changes" : "Add contract"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEmployees;
