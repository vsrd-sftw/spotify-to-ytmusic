//! Win32 Job Object plumbing so the sidecar dies when Tauri dies.
//!
//! PyInstaller --onefile leaves a bootstrap launcher process that does not
//! always exit when its child Python runtime is killed. The result is an
//! orphaned `spotify-to-ytmusic-server.exe` that survives the host (#98).
//!
//! A Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` makes the OS itself
//! terminate every process assigned to the job the moment the last handle to
//! the job closes — which happens automatically when the host process exits,
//! crashes, or is killed externally. This is a safety net independent of any
//! cleanup code Tauri might or might not run.

use std::io;

use windows_sys::Win32::Foundation::{CloseHandle, FALSE, HANDLE, INVALID_HANDLE_VALUE};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, SetInformationJobObject,
    JobObjectExtendedLimitInformation, JOBOBJECT_BASIC_LIMIT_INFORMATION,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};
use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE};

/// Wraps a `HANDLE` so `Drop` closes it.
pub struct JobHandle {
    handle: HANDLE,
}

// SAFETY: a HANDLE is just an opaque integer; sharing it across threads is
// fine as long as we only call thread-safe Win32 APIs on it (which is the
// case for AssignProcessToJobObject and CloseHandle).
unsafe impl Send for JobHandle {}
unsafe impl Sync for JobHandle {}

impl JobHandle {
    /// Create a new job configured to kill all assigned processes when the
    /// last handle closes (i.e. when the host exits for any reason).
    pub fn create_kill_on_close() -> io::Result<Self> {
        let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if handle.is_null() {
            return Err(io::Error::last_os_error());
        }

        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { std::mem::zeroed() };
        info.BasicLimitInformation = JOBOBJECT_BASIC_LIMIT_INFORMATION {
            LimitFlags: JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            ..unsafe { std::mem::zeroed() }
        };

        let ok = unsafe {
            SetInformationJobObject(
                handle,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const _,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            )
        };
        if ok == 0 {
            let err = io::Error::last_os_error();
            unsafe { CloseHandle(handle) };
            return Err(err);
        }

        Ok(JobHandle { handle })
    }

    /// Assign a process (by PID) to this job. The process must have been
    /// created without already belonging to a different job, which is the
    /// default for processes spawned by `Command::spawn` / Tauri's shell
    /// plugin on Windows 10+ (nested jobs are allowed since Win8).
    pub fn assign_pid(&self, pid: u32) -> io::Result<()> {
        let proc_handle = unsafe {
            OpenProcess(
                PROCESS_TERMINATE | PROCESS_SET_QUOTA,
                FALSE,
                pid,
            )
        };
        if proc_handle.is_null() || proc_handle == INVALID_HANDLE_VALUE {
            return Err(io::Error::last_os_error());
        }

        let ok = unsafe { AssignProcessToJobObject(self.handle, proc_handle) };
        let err = if ok == 0 {
            Some(io::Error::last_os_error())
        } else {
            None
        };
        unsafe { CloseHandle(proc_handle) };

        match err {
            Some(e) => Err(e),
            None => Ok(()),
        }
    }
}

impl Drop for JobHandle {
    fn drop(&mut self) {
        if !self.handle.is_null() {
            unsafe { CloseHandle(self.handle) };
        }
    }
}
