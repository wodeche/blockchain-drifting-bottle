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
    event BottlePicked(string indexed bottleId, address indexed picker, uint256 timestamp);

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
    function throwBottle(string memory _content, address _targetReceiver) public {
        require(bytes(_content).length > 0, "Content cannot be empty");
        require(bytes(_content).length <= 500, "Content too long");
        require(_targetReceiver == address(0) || _targetReceiver != msg.sender, "Cannot target yourself");

        string memory finalContent = _content;
        if (_targetReceiver != address(0)) {
            // 对指定接收者的内容进行加密
            finalContent = encrypt(_content, _targetReceiver);
        }

        string memory bottleId = generateBottleId(msg.sender, block.timestamp);
        
        Bottle memory newBottle = Bottle({
            id: bottleId,
            content: finalContent,
            sender: msg.sender,
            targetReceiver: _targetReceiver,  // 设置指定接收者
            timestamp: block.timestamp,
            isPicked: false,
            picker: address(0)
        });

        bottles.push(newBottle);
        userThrownBottles[msg.sender].push(bottles.length - 1);
        
        // 如果指定了接收者，记录到 userTargetedBottles
        if (_targetReceiver != address(0)) {
            userTargetedBottles[_targetReceiver].push(bottles.length - 1);
        }

        emit BottleThrown(bottleId, msg.sender, _targetReceiver, block.timestamp);
    }

    // 随机捞取一个漂流瓶（排除指定接收者的漂流瓶）
    function pickBottle() public returns (Bottle memory) {
        require(bottles.length > 0, "No bottles available");

        uint256[] memory availableIndices = new uint256[](bottles.length);
        uint256 count = 0;

        for (uint256 i = 0; i < bottles.length; i++) {
            // 只能捞取未被捞取、不是自己投放的、且没有指定接收者的漂流瓶
            if (!bottles[i].isPicked && 
                bottles[i].sender != msg.sender && 
                bottles[i].targetReceiver == address(0)) {
                availableIndices[count] = i;
                count++;
            }
        }

        require(count > 0, "No available bottles to pick");

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ))) % count;

        uint256 bottleIndex = availableIndices[randomIndex];
        
        bottles[bottleIndex].isPicked = true;
        bottles[bottleIndex].picker = msg.sender;
        userPickedBottles[msg.sender].push(bottleIndex);

        emit BottlePicked(bottles[bottleIndex].id, msg.sender, block.timestamp);
        
        return bottles[bottleIndex];
    }

    // 新增：捞取指定给我的漂流瓶
    function pickTargetedBottle() public returns (Bottle memory) {
        uint256[] storage targetedIndices = userTargetedBottles[msg.sender];
        require(targetedIndices.length > 0, "No bottles targeted to you");

        // 找到第一个未被捞取的漂流瓶
        for (uint256 i = 0; i < targetedIndices.length; i++) {
            uint256 bottleIndex = targetedIndices[i];
            if (!bottles[bottleIndex].isPicked) {
                bottles[bottleIndex].isPicked = true;
                bottles[bottleIndex].picker = msg.sender;
                userPickedBottles[msg.sender].push(bottleIndex);

                emit BottlePicked(bottles[bottleIndex].id, msg.sender, block.timestamp);
                return bottles[bottleIndex];
            }
        }

        revert("No unpicked bottles targeted to you");
    }

    // 新增：获取指定给我的未捞取漂流瓶数量
    function getMyTargetedBottleCount() public view returns (uint256) {
        uint256[] storage targetedIndices = userTargetedBottles[msg.sender];
        uint256 count = 0;
        for (uint256 i = 0; i < targetedIndices.length; i++) {
            if (!bottles[targetedIndices[i]].isPicked) {
                count++;
            }
        }
        return count;
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
    function getMyTargetedBottles() public view returns (Bottle[] memory) {
        uint256[] storage indices = userTargetedBottles[msg.sender];
        Bottle[] memory myBottles = new Bottle[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            myBottles[i] = bottles[indices[i]];
        }
        
        return myBottles;
    }

    // 获取所有漂流瓶数量
    function getBottleCount() public view returns (uint256) {
        return bottles.length;
    }

    // 获取未被捞取的漂流瓶数量
    function getAvailableBottleCount() public view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < bottles.length; i++) {
            if (!bottles[i].isPicked && bottles[i].targetReceiver == address(0)) {
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
} 