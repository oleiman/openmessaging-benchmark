use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Foo {
    pub label: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Union {
    Boolean(bool),
    Double(f64),
    Array(Vec<String>),
}

#[derive(Serialize, Deserialize)]
pub enum Enum {
    A,
    B,
    C,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub label: String,
    pub children: Vec<Node>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Interop {
    pub int_field: i32,
    pub long_field: i64,
    pub string_field: String,
    pub bool_field: bool,
    pub float_field: f32,
    pub double_field: f64,
    pub bytes_field: String,
    pub null_field: Option<()>,
    pub array_field: Vec<f64>,
    pub map_field: HashMap<String, Foo>,
    pub union_field: Union,
    pub enum_field: Enum,
    pub fixed_field: String,
    pub record_field: Node,
}
