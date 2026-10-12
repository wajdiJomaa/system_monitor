use serde::Serialize;

#[derive(Default, Serialize)]
pub struct CpuIdentity {
    pub vendor: Option<String>,
    pub model_name: Option<String>,
    pub family: Option<String>,
    pub model: Option<String>,
    pub stepping: Option<String>,
    pub microcode: Option<String>,
}
