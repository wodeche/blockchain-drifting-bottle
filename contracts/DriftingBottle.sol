// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DriftingBottle {
    // 漂流瓶结构
    struct Bottle {
        string id;          // 漂流瓶唯一ID
        string content;     // 内容
        address sender;     // 发送者
        address targetReceiver;  // 新增：指定接收者
        uint256 timestamp; // 发送时间
        bool isPicked;     // 是否被捞取
        address picker;    // 捞取者
    }

    // 存储所有漂流瓶
    Bottle[] private bottles;
    
    // 用户投放的漂流瓶映射
    mapping(address => uint256[]) private userThrownBottles;
    
    // 用户捞到的漂流瓶映射
    mapping(address => uint256[]) private userPickedBottles;

    // 新增：记录指定给用户的漂流瓶
    mapping(address => uint256[]) private userTargetedBottles;

    // 事件
    event BottleThrown(string indexed bottleId, address indexed sender, address indexed targetReceiver, uint256 timestamp);
    event BottlePicked(
        string indexed bottleId,
        address indexed picker,
        string content,
        address sender,
        uint256 timestamp
    );

    // 生成随机ID的函数
    function generateBottleId(address sender, uint256 timestamp) private pure returns (string memory) {
        return string(abi.encodePacked(sender, timestamp));
    }

    // 添加加密函数
    function encrypt(string memory content, address receiver) internal pure returns (string memory) {
        bytes memory contentBytes = bytes(content);
        bytes memory result = new bytes(contentBytes.length);
        bytes20 key = bytes20(receiver); // 使用接收者地址作为密钥
        
        for (uint i = 0; i < contentBytes.length; i++) {
            result[i] = contentBytes[i] ^ key[i % 20];
        }
        
        return string(result);
    }

    // 添加解密函数（与加密相同，因为是 XOR 操作）
    function decrypt(string memory encryptedContent, address receiver) internal pure returns (string memory) {
        return encrypt(encryptedContent, receiver); // XOR 两次等于原文
    }

    // 投放漂流瓶
    function throwBottle(string memory _content, address _targetReceiver) public returns (
        bool success,
        string[] memory debugMessages
    ) {
        require(bytes(_content).length > 0, "Content cannot be empty");
        require(bytes(_content).length <= 500, "Content too long");
        require(_targetReceiver == address(0) || _targetReceiver != msg.sender, "Cannot target yourself");

        // 创建调试消息数组
        string[] memory messages = new string[](10);
        uint256 messageCount = 0;

        messages[messageCount++] = string(abi.encodePacked(
            "Sender: ", addressToString(msg.sender)
        ));
        messages[messageCount++] = string(abi.encodePacked(
            "Target: ", addressToString(_targetReceiver)
        ));

        string memory finalContent = _content;
        if (_targetReceiver != address(0)) {
            finalContent = encrypt(_content, _targetReceiver);
        }

        string memory bottleId = generateBottleId(msg.sender, block.timestamp);
        uint256 bottleIndex = bottles.length;
        
        messages[messageCount++] = string(abi.encodePacked(
            "New bottle index: ", uint2str(bottleIndex)
        ));
        
        // 确保正确设置 targetReceiver
        Bottle memory newBottle = Bottle({
            id: bottleId,
            content: finalContent,
            sender: msg.sender,
            targetReceiver: _targetReceiver,
            timestamp: block.timestamp,
            isPicked: false,
            picker: address(0)
        });

        bottles.push(newBottle);
        userThrownBottles[msg.sender].push(bottleIndex);
        
        if (_targetReceiver != address(0)) {
            // 获取当前长度
            uint256 beforeLength = userTargetedBottles[_targetReceiver].length;
            messages[messageCount++] = string(abi.encodePacked(
                "Before targeted length: ", uint2str(beforeLength)
            ));
            
            userTargetedBottles[_targetReceiver].push(bottleIndex);
            
            // 获取更新后的长度
            uint256 afterLength = userTargetedBottles[_targetReceiver].length;
            messages[messageCount++] = string(abi.encodePacked(
                "After targeted length: ", uint2str(afterLength)
            ));
            
            // 验证更新
            uint256 verifyLength = userTargetedBottles[_targetReceiver].length;
            messages[messageCount++] = string(abi.encodePacked(
                "Verify length: ", uint2str(verifyLength)
            ));
            
            emit BottleThrown(bottleId, msg.sender, _targetReceiver, block.timestamp);
        }

        // 裁剪调试消息数组到实际大小
        string[] memory finalMessages = new string[](messageCount);
        for (uint256 i = 0; i < messageCount; i++) {
            finalMessages[i] = messages[i];
        }
        
        return (true, finalMessages);
    }

    // 随机捞取一个漂流瓶（排除指定接收者的漂流瓶和自己的漂流瓶）
    function pickBottle() public returns (Bottle memory) {
        require(getAvailableBottleCount() > 0, "No available bottles");
        
        // 找到一个随机的未被捞取的漂流瓶
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % bottles.length;
        uint256 startIndex = randomIndex;
        
        do {
            if (!bottles[randomIndex].isPicked && 
                bottles[randomIndex].targetReceiver == address(0) &&
                bottles[randomIndex].sender != msg.sender) {
                
                // 更新漂流瓶状态
                bottles[randomIndex].isPicked = true;
                bottles[randomIndex].picker = msg.sender;
                
                // 添加到用户的捞取记录中
                userPickedBottles[msg.sender].push(randomIndex);
                
                // 发出事件
                emit BottlePicked(
                    bottles[randomIndex].id,
                    msg.sender,
                    bottles[randomIndex].content,
                    bottles[randomIndex].sender,
                    block.timestamp
                );
                
                // 返回漂流瓶
                return bottles[randomIndex];
            }
            randomIndex = (randomIndex + 1) % bottles.length;
        } while (randomIndex != startIndex);
        
        revert("No available bottles found");
    }

    // 新增：捞取指定给我的漂流瓶
    function pickTargetedBottle() public returns (Bottle memory) {
        uint256[] storage targetedIndices = userTargetedBottles[msg.sender];
        require(targetedIndices.length > 0, "No bottles targeted to you");

        for (uint256 i = 0; i < targetedIndices.length; i++) {
            uint256 bottleIndex = targetedIndices[i];
            if (!bottles[bottleIndex].isPicked) {
                Bottle storage bottle = bottles[bottleIndex];
                // 使用 uint160 转换来比较地址
                if (uint160(bottle.targetReceiver) == uint160(msg.sender)) {
                    // 标记为已捞取
                    bottles[bottleIndex].isPicked = true;
                    bottles[bottleIndex].picker = msg.sender;
                    
                    // 添加到用户的捞取记录中
                    userPickedBottles[msg.sender].push(bottleIndex);
                    
                    // 如果是指定接收者，解密内容
                    string memory decryptedContent = decrypt(bottle.content, msg.sender);
                    
                    // 发出事件
                    emit BottlePicked(
                        bottle.id,
                        msg.sender,
                        decryptedContent,
                        bottle.sender,
                        block.timestamp
                    );
                    
                    // 创建一个新的 Bottle 对象返回，避免修改存储的加密内容
                    return Bottle({
                        id: bottle.id,
                        content: decryptedContent,  // 返回解密后的内容
                        sender: bottle.sender,
                        targetReceiver: bottle.targetReceiver,
                        timestamp: bottle.timestamp,
                        isPicked: true,
                        picker: msg.sender
                    });
                }
            }
        }

        revert("No unpicked bottles targeted to you");
    }

    // 新增：获取指定给我的未捞取漂流瓶数量和调试信息
    function getMyTargetedBottleCount(address user) public view returns (
        uint256 count,
        string[] memory debugMessages
    ) {
        // 使用传入的 user 地址而不是 msg.sender
        uint256[] storage targetedIndices = userTargetedBottles[user];
        count = 0;
        
        // 创建调试消息数组
        uint256 maxMessages = 3 + (targetedIndices.length * 4);
        string[] memory messages = new string[](maxMessages);
        uint256 messageCount = 0;
        
        messages[messageCount++] = string(abi.encodePacked(
            "Initial indices length: ", uint2str(targetedIndices.length)
        ));
        
        messages[messageCount++] = string(abi.encodePacked(
            "Requested user: ", addressToString(user)
        ));
        
        messages[messageCount++] = string(abi.encodePacked(
            "Contract caller: ", addressToString(msg.sender)
        ));

        for (uint256 i = 0; i < targetedIndices.length; i++) {
            uint256 index = targetedIndices[i];
            if (index >= bottles.length) {
                continue;
            }
            
            address bottleTarget = bottles[index].targetReceiver;
            
            messages[messageCount++] = string(abi.encodePacked(
                "Checking bottle at index: ", uint2str(index)
            ));
            messages[messageCount++] = string(abi.encodePacked(
                "Bottle target: ", addressToString(bottleTarget)
            ));
            messages[messageCount++] = string(abi.encodePacked(
                "Is picked: ", bottles[index].isPicked ? "true" : "false"
            ));
            messages[messageCount++] = string(abi.encodePacked(
                "Direct comparison: ", bottleTarget == user ? "true" : "false"
            ));

            if (!bottles[index].isPicked && bottleTarget == user) {
                count++;
            }
        }
        
        // 裁剪调试消息数组到实际大小
        string[] memory finalMessages = new string[](messageCount);
        for (uint256 i = 0; i < messageCount; i++) {
            finalMessages[i] = messages[i];
        }
        
        return (count, finalMessages);
    }

    // 辅助函数：将 uint160 转换为十六进制字符串
    function toHexString(uint160 value) internal pure returns (string memory) {
        bytes memory buffer = new bytes(40);
        for(uint256 i = 0; i < 20; i++) {
            buffer[i*2] = bytes1(uint8(uint8((value >> (8*(19-i))) >> 4) + (uint8((value >> (8*(19-i))) >> 4) < 10 ? 48 : 87)));
            buffer[i*2+1] = bytes1(uint8(uint8(value >> (8*(19-i))) & 0x0f + (uint8(value >> (8*(19-i))) & 0x0f < 10 ? 48 : 87)));
        }
        return string(buffer);
    }

    // 获取我投放的漂流瓶
    function getMyThrownBottles() public view returns (Bottle[] memory) {
        uint256[] storage indices = userThrownBottles[msg.sender];
        Bottle[] memory myBottles = new Bottle[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            myBottles[i] = bottles[indices[i]];
        }
        
        return myBottles;
    }

    // 获取我捞到的漂流瓶
    function getMyPickedBottles() public view returns (Bottle[] memory) {
        uint256[] storage indices = userPickedBottles[msg.sender];
        Bottle[] memory myBottles = new Bottle[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            myBottles[i] = bottles[indices[i]];
        }
        
        return myBottles;
    }

    // 新增：获取指定给我的漂流瓶
    function getMyTargetedBottles() public view returns (
        Bottle[] memory targetedBottles,
        string[] memory debugMessages
    ) {
        uint256[] storage indices = userTargetedBottles[msg.sender];
        uint256 count = 0;
        
        // 创建调试消息数组
        string[] memory messages = new string[](indices.length * 3 + 1);
        uint256 messageCount = 0;
        
        messages[messageCount++] = string(abi.encodePacked(
            "Initial indices length: ", uint2str(indices.length)
        ));
        
        // 先计算未捞取的数量
        for (uint256 i = 0; i < indices.length; i++) {
            messages[messageCount++] = string(abi.encodePacked(
                "Checking bottle at index: ", uint2str(indices[i]),
                ", targetReceiver: ", addressToString(bottles[indices[i]].targetReceiver),
                ", isPicked: ", bottles[indices[i]].isPicked ? "true" : "false"
            ));
            
            if (!bottles[indices[i]].isPicked && 
                bottles[indices[i]].targetReceiver == msg.sender) {
                count++;
            }
        }
        
        // 创建正确大小的数组
        Bottle[] memory myBottles = new Bottle[](count);
        uint256 currentIndex = 0;
        
        // 只添加未捞取的漂流瓶
        for (uint256 i = 0; i < indices.length; i++) {
            if (!bottles[indices[i]].isPicked && 
                bottles[indices[i]].targetReceiver == msg.sender) {
                myBottles[currentIndex] = bottles[indices[i]];
                currentIndex++;
            }
        }
        
        // 裁剪调试消息数组到实际大小
        string[] memory finalMessages = new string[](messageCount);
        for (uint256 i = 0; i < messageCount; i++) {
            finalMessages[i] = messages[i];
        }
        
        return (myBottles, finalMessages);
    }

    // 辅助函数：将 uint 转换为 string
    function uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }

    // 辅助函数：将地址转换为字符串
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    // 获取所有漂流瓶数量
    function getBottleCount() public view returns (uint256) {
        return bottles.length;
    }

    // 获取未被捞取的漂流瓶数量（排除自己的漂流瓶）
    function getAvailableBottleCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < bottles.length; i++) {
            if (!bottles[i].isPicked && 
                bottles[i].targetReceiver == address(0) &&
                bottles[i].sender != msg.sender) {
                count++;
            }
        }
        return count;
    }

    // 添加一个调试函数
    function getBottleDetails(uint256 index) public view returns (
        string memory id,
        address sender,
        bool isPicked,
        address picker
    ) {
        require(index < bottles.length, "Index out of bounds");
        Bottle storage bottle = bottles[index];
        return (
            bottle.id,
            bottle.sender,
            bottle.isPicked,
            bottle.picker
        );
    }

    // 新增：获取最后一个被当前用户捞取的漂流瓶
    function getMyLastPickedBottle() public view returns (Bottle memory) {
        // 使用 userPickedBottles 数组来获取用户捞取的漂流瓶
        uint256[] storage pickedIndices = userPickedBottles[msg.sender];
        if (pickedIndices.length == 0) {
            revert("No picked bottle found");
        }
        
        // 返回最后一个捞取的漂流瓶
        uint256 lastIndex = pickedIndices[pickedIndices.length - 1];
        return bottles[lastIndex];
    }

    // 添加调试函数
    function debugUserTargetedBottles(address user) public view returns (
        uint256[] memory indices,
        bool[] memory isPicked,
        address[] memory targetReceivers
    ) {
        uint256[] storage targetedIndices = userTargetedBottles[user];
        uint256 length = targetedIndices.length;
        
        indices = new uint256[](length);
        isPicked = new bool[](length);
        targetReceivers = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            indices[i] = targetedIndices[i];
            isPicked[i] = bottles[targetedIndices[i]].isPicked;
            targetReceivers[i] = bottles[targetedIndices[i]].targetReceiver;
        }
        
        return (indices, isPicked, targetReceivers);
    }

    // 新增：调试函数来检查漂流瓶的目标接收者
    function debugBottleTarget(uint256 index) public view returns (
        address bottleTarget,
        bool isPicked,
        address currentUser
    ) {
        require(index < bottles.length, "Index out of bounds");
        return (
            bottles[index].targetReceiver,
            bottles[index].isPicked,
            msg.sender
        );
    }

    // 添加调试事件
    event Debug(string message, address user, uint256 value);
} 