//
//  InMemoryLocalStorage.swift
//  IndigoInvestor
//
//  In-memory storage implementation for Supabase auth (for development)
//

import Foundation
import Supabase

class InMemoryLocalStorage: AuthLocalStorage {
    private var storage: [String: Data] = [:]
    private let queue = DispatchQueue(label: "com.indigo.investor.storage", attributes: .concurrent)
    
    func store(key: String, value: Data) throws {
        queue.async(flags: .barrier) {
            self.storage[key] = value
        }
    }
    
    func retrieve(key: String) throws -> Data? {
        queue.sync {
            return storage[key]
        }
    }
    
    func remove(key: String) throws {
        queue.async(flags: .barrier) {
            self.storage.removeValue(forKey: key)
        }
    }
}
