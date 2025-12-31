//
//  InMemoryAuthStorage.swift
//  IndigoInvestor
//
//  In-memory storage implementation for Supabase auth
//

import Foundation
import Supabase

final class InMemoryAuthStorage: AuthLocalStorage, @unchecked Sendable {
    private var storage: [String: Data] = [:]
    private let queue = DispatchQueue(label: "com.indigo.investor.auth.storage", attributes: .concurrent)
    
    func store(key: String, value: Data) throws {
        queue.async(flags: .barrier) { [weak self] in
            self?.storage[key] = value
        }
    }
    
    func retrieve(key: String) throws -> Data? {
        queue.sync {
            storage[key]
        }
    }
    
    func remove(key: String) throws {
        queue.async(flags: .barrier) { [weak self] in
            self?.storage.removeValue(forKey: key)
        }
    }
}
